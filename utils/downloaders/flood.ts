import { baseUrl, type DownloaderClient, type DownloaderConfig } from './types';

interface AuthResponse {
  success?: boolean;
  username?: string;
  message?: string;
}

interface ConnectionTestResponse {
  isConnected?: boolean;
}

interface ErrorResponse {
  message?: string;
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
      headers: { Accept: 'application/json', ...init?.headers },
    });
  } catch {
    throw new Error(`Could not reach Flood at ${baseUrl(config)}. Is Flood running?`);
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as ErrorResponse;
    if (json.message) return json.message;
  } catch {
    // Fall through to status text.
  }
  return `HTTP ${res.status}`;
}

async function login(config: DownloaderConfig): Promise<void> {
  const res = await apiFetch(config, '/api/auth/authenticate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: config.username,
      password: config.password,
    }),
  });

  if (res.status === 401) {
    throw new Error('Login failed. Check your Flood username and password.');
  }
  if (res.status === 400) {
    throw new Error(`Flood login failed (${await readError(res)}).`);
  }
  if (!res.ok) throw new Error(`Flood error (${await readError(res)}).`);

  const json = (await res.json()) as AuthResponse;
  if (json.success === false) {
    throw new Error('Login failed. Check your Flood username and password.');
  }
}

export const flood: DownloaderClient = {
  name: 'Flood',
  needsUsername: true,
  supportsCategories: true,
  urlHint: 'Example: http://192.168.1.100:3000',

  async addMagnet(config, magnet, options) {
    await login(config);

    const body: Record<string, unknown> = {
      urls: [magnet],
      start: true,
    };
    if (options?.category) body.tags = [options.category];

    const res = await apiFetch(config, '/api/torrents/add-urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.status === 401) {
      throw new Error('Login failed. Check your Flood username and password.');
    }
    if (res.status === 403) {
      throw new Error('Flood rejected the destination path. Check allowed paths in Flood settings.');
    }
    if (!res.ok && res.status !== 202 && res.status !== 207) {
      throw new Error(`Flood error (${await readError(res)}).`);
    }
  },

  async testConnection(config) {
    await login(config);

    const res = await apiFetch(config, '/api/client/connection-test');
    if (res.status === 401) {
      throw new Error('Login failed. Check your Flood username and password.');
    }
    if (!res.ok) throw new Error(`Flood error (${await readError(res)}).`);

    const json = (await res.json()) as ConnectionTestResponse;
    if (!json.isConnected) {
      throw new Error('Flood is running but not connected to its torrent client.');
    }

    const verify = await apiFetch(config, '/api/auth/verify');
    if (verify.ok) {
      const user = (await verify.json()) as AuthResponse;
      if (user.username) return `Flood (connected as ${user.username})`;
    }
    return 'Flood (connected)';
  },
};
