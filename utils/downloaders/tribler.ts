import { baseUrl, type DownloaderClient, type DownloaderConfig } from './types';

interface DownloadsResponse {
  downloads?: unknown[];
  error?: { message?: string };
}

interface AddDownloadResponse {
  started?: boolean;
  infohash?: string;
  error?: { message?: string };
}

interface SwaggerInfo {
  info?: { version?: string };
}

function apiHeaders(config: DownloaderConfig): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (config.password) headers['X-Api-Key'] = config.password;
  return headers;
}

async function apiFetch(
  config: DownloaderConfig,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = `${baseUrl(config)}${path}`;
  try {
    return await fetch(url, {
      ...init,
      credentials: 'include',
      headers: { ...apiHeaders(config), ...init?.headers },
    });
  } catch {
    throw new Error(`Could not reach Tribler at ${baseUrl(config)}. Is Tribler running?`);
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as { error?: { message?: string } };
    if (json.error?.message) return json.error.message;
  } catch {
    // Fall through to status text.
  }
  return `HTTP ${res.status}`;
}

export const tribler: DownloaderClient = {
  name: 'Tribler',
  needsUsername: false,
  supportsCategories: false,
  urlHint: 'Example: http://192.168.1.100:8085',

  async addMagnet(config, magnet) {
    const res = await apiFetch(config, '/api/downloads', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri: magnet }),
    });
    if (res.status === 401) {
      throw new Error('Login failed. Check your Tribler API key.');
    }
    if (!res.ok) throw new Error(`Tribler error (${await readError(res)}).`);

    const json = (await res.json()) as AddDownloadResponse;
    if (json.error?.message) throw new Error(`Tribler: ${json.error.message}`);
    if (json.started === false) {
      throw new Error('Tribler did not start the download.');
    }
  },

  async testConnection(config) {
    const res = await apiFetch(config, '/api/downloads');
    if (res.status === 401) {
      throw new Error('Login failed. Check your Tribler API key.');
    }
    if (!res.ok) throw new Error(`Tribler error (${await readError(res)}).`);

    const downloads = (await res.json()) as DownloadsResponse;
    if (downloads.error?.message) throw new Error(`Tribler: ${downloads.error.message}`);

    const versionRes = await apiFetch(config, '/docs/swagger.json');
    if (versionRes.ok) {
      const swagger = (await versionRes.json()) as SwaggerInfo;
      const version = swagger.info?.version?.trim();
      if (version) return version;
    }
    return 'Tribler (connected)';
  },
};
