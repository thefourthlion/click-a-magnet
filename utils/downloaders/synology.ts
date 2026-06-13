import { baseUrl, type DownloaderClient, type DownloaderConfig } from './types';

const SESSION = 'DownloadStation';
const AUTH_VERSIONS = [7, 6, 3, 2] as const;

interface SynoError {
  code: number;
  errors?: Record<string, { reason?: string }>;
}

interface SynoResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: SynoError;
}

interface ApiInfoEntry {
  path: string;
  minVersion: number;
  maxVersion: number;
}

type ApiInfoMap = Record<string, ApiInfoEntry>;

interface DownloadStationInfo {
  version_string?: string;
}

interface DownloadStationConfig {
  default_destination?: string | null;
}

const sessionCache = new Map<string, string>();

function cacheKey(config: DownloaderConfig): string {
  return `${baseUrl(config)}:${config.username}`;
}

function clearSession(config: DownloaderConfig): void {
  sessionCache.delete(cacheKey(config));
}

async function apiFetch(
  config: DownloaderConfig,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = `${baseUrl(config)}/webapi/${path}`;
  try {
    return await fetch(url, init);
  } catch {
    throw new Error(
      `Could not reach Synology DSM at ${baseUrl(config)}. Check the URL and that DSM is reachable.`,
    );
  }
}

function buildQuery(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

async function readSynoResponse<T>(res: Response): Promise<SynoResponse<T>> {
  if (!res.ok) {
    throw new Error(`Synology API error (HTTP ${res.status}).`);
  }
  try {
    return (await res.json()) as SynoResponse<T>;
  } catch {
    throw new Error('Synology returned an unexpected response.');
  }
}

function authErrorMessage(code: number): string {
  switch (code) {
    case 400:
      return 'Login failed. Check your DSM username and password.';
    case 401:
      return 'This DSM account is disabled.';
    case 402:
      return 'This DSM account does not have permission to use Download Station.';
    case 403:
      return 'Two-step verification is enabled. Use an app password or a dedicated API account without 2FA.';
    case 404:
      return 'Two-step verification code required or incorrect.';
    default:
      return `Synology login failed (error ${code}).`;
  }
}

function taskErrorMessage(code: number, errors?: SynoError['errors']): string {
  if (code === 120 || code === 406) {
    return 'No download destination set. Choose a category (destination folder) or set a default location in Download Station for this user.';
  }
  if (code === 403) {
    return 'Download destination does not exist. Check the category path matches a shared folder in Download Station.';
  }
  if (code === 402) {
    return 'Download destination denied. Check folder permissions for this DSM user.';
  }
  if (errors?.destination?.reason === 'required') {
    return 'Download destination is required. Set a category or configure a default location in Download Station.';
  }
  return `Download Station rejected the request (error ${code}).`;
}

function assertSuccess<T>(
  json: SynoResponse<T>,
  context: 'auth' | 'task',
  config: DownloaderConfig,
): T {
  if (json.success) return json.data as T;

  const code = json.error?.code ?? 0;
  if (code >= 105 && code <= 107) {
    clearSession(config);
  }

  if (context === 'auth') {
    throw new Error(authErrorMessage(code));
  }
  throw new Error(taskErrorMessage(code, json.error?.errors));
}

async function queryApiInfo(config: DownloaderConfig): Promise<ApiInfoMap> {
  const query = [
    'SYNO.API.Auth',
    'SYNO.DownloadStation.Info',
    'SYNO.DownloadStation.Task',
    'SYNO.DownloadStation2.Task',
  ].join(',');

  const res = await apiFetch(
    config,
    `query.cgi?${buildQuery({
      api: 'SYNO.API.Info',
      version: '1',
      method: 'query',
      query,
    })}`,
  );

  const json = await readSynoResponse<Record<string, ApiInfoEntry>>(res);
  const data = assertSuccess(json, 'task', config);
  const info: ApiInfoMap = {};
  for (const [name, entry] of Object.entries(data)) {
    info[name] = {
      path: entry.path,
      minVersion: entry.minVersion,
      maxVersion: entry.maxVersion,
    };
  }
  return info;
}

async function login(config: DownloaderConfig, apiInfo?: ApiInfoMap): Promise<string> {
  const cached = sessionCache.get(cacheKey(config));
  if (cached) return cached;

  const info = apiInfo ?? (await queryApiInfo(config));
  const authInfo = info['SYNO.API.Auth'];
  if (!authInfo) {
    throw new Error('This Synology device does not expose the authentication API.');
  }

  let lastError = 'Login failed. Check your DSM username and password.';
  for (const version of AUTH_VERSIONS) {
    if (version < authInfo.minVersion || version > authInfo.maxVersion) continue;

    const res = await apiFetch(
      config,
      `auth.cgi?${buildQuery({
        api: 'SYNO.API.Auth',
        version: String(version),
        method: 'login',
        account: config.username,
        passwd: config.password,
        session: SESSION,
        format: 'sid',
      })}`,
    );

    const json = await readSynoResponse<{ sid?: string }>(res);
    if (json.success && json.data?.sid) {
      sessionCache.set(cacheKey(config), json.data.sid);
      return json.data.sid;
    }
    if (json.error?.code === 103) continue;
    if (json.error) lastError = authErrorMessage(json.error.code);
  }

  throw new Error(lastError);
}

async function authenticatedGet<T>(
  config: DownloaderConfig,
  cgiPath: string,
  params: Record<string, string>,
  context: 'auth' | 'task' = 'task',
): Promise<T> {
  const sid = await login(config);
  const res = await apiFetch(
    config,
    `${cgiPath}?${buildQuery({ ...params, _sid: sid })}`,
  );
  const json = await readSynoResponse<T>(res);
  return assertSuccess(json, context, config);
}

function usesV2TaskApi(apiInfo: ApiInfoMap): boolean {
  const v2 = apiInfo['SYNO.DownloadStation2.Task'];
  return Boolean(v2 && v2.maxVersion >= 2);
}

async function getDefaultDestination(config: DownloaderConfig): Promise<string | undefined> {
  const sid = await login(config);
  const res = await apiFetch(
    config,
    `DownloadStation/info.cgi?${buildQuery({
      api: 'SYNO.DownloadStation.Info',
      version: '1',
      method: 'getconfig',
      _sid: sid,
    })}`,
  );
  const json = await readSynoResponse<DownloadStationConfig>(res);
  const data = assertSuccess(json, 'task', config);
  const dest = data.default_destination?.trim();
  return dest || undefined;
}

async function resolveDestination(
  config: DownloaderConfig,
  category: string | undefined,
  requireDestination: boolean,
): Promise<string | undefined> {
  const fromCategory = category?.trim();
  if (fromCategory) return fromCategory;

  const defaultDest = await getDefaultDestination(config);
  if (defaultDest) return defaultDest;

  if (requireDestination) {
    throw new Error(
      'Download destination is required. Set a category (shared-folder path) or configure a default location in Download Station for this DSM user.',
    );
  }
  return undefined;
}

export const synology: DownloaderClient = {
  name: 'Synology Download Station',
  needsUsername: true,
  supportsCategories: true,
  urlHint: 'Example: http://192.168.1.100:5000',

  async addMagnet(config, magnet, options) {
    const apiInfo = await queryApiInfo(config);
    const v2 = usesV2TaskApi(apiInfo);
    const destination = await resolveDestination(config, options?.category, v2);

    const sid = await login(config, apiInfo);
    const createParams: Record<string, string> = {
      api: v2 ? 'SYNO.DownloadStation2.Task' : 'SYNO.DownloadStation.Task',
      version: v2 ? '2' : '3',
      method: 'create',
      _sid: sid,
    };

    if (v2) {
      createParams.type = 'url';
      createParams.url = magnet;
      createParams.create_list = 'false';
      if (destination) createParams.destination = destination;
    } else {
      createParams.uri = magnet;
      if (destination) createParams.destination = destination;
    }

    const cgiPath = v2 ? 'DownloadStation/entry.cgi' : 'DownloadStation/task.cgi';
    const res = await apiFetch(config, `${cgiPath}?${buildQuery(createParams)}`);
    const json = await readSynoResponse(res);
    assertSuccess(json, 'task', config);
  },

  async testConnection(config) {
    const apiInfo = await queryApiInfo(config);
    await login(config, apiInfo);

    const info = await authenticatedGet<DownloadStationInfo>(
      config,
      'DownloadStation/info.cgi',
      {
        api: 'SYNO.DownloadStation.Info',
        version: '1',
        method: 'getinfo',
      },
    );

    if (info.version_string) {
      return `Download Station ${info.version_string}`;
    }
    return 'Synology Download Station (connected)';
  },
};
