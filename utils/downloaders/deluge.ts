import { baseUrl, type DownloaderClient, type DownloaderConfig } from './types';

interface JsonRpcResponse {
  result: unknown;
  error: { message?: string } | null;
}

let requestId = 0;

async function rpc(base: string, method: string, params: unknown[]): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${base}/json`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, params, id: ++requestId }),
    });
  } catch {
    throw new Error(`Could not reach Deluge at ${base}. Is the Web UI running?`);
  }
  if (!res.ok) throw new Error(`Deluge error (HTTP ${res.status}).`);
  const json = (await res.json()) as JsonRpcResponse;
  if (json.error) throw new Error(`Deluge: ${json.error.message ?? 'unknown error'}`);
  return json.result;
}

/** Deluge's Web UI uses a single password (no username). */
async function login(config: DownloaderConfig): Promise<string> {
  const base = baseUrl(config);
  const ok = await rpc(base, 'auth.login', [config.password]);
  if (!ok) throw new Error('Login failed. Check your Deluge Web UI password.');
  const connected = await rpc(base, 'web.connected', []);
  if (!connected) {
    throw new Error('Logged in, but the Deluge Web UI is not connected to a daemon. Open the Web UI and connect first.');
  }
  return base;
}

export const deluge: DownloaderClient = {
  name: 'Deluge',
  needsUsername: false,
  supportsCategories: false,
  urlHint: 'Example: http://192.168.1.100:8112',

  async addMagnet(config, magnet) {
    const base = await login(config);
    await rpc(base, 'core.add_torrent_magnet', [magnet, {}]);
  },

  async testConnection(config) {
    const base = await login(config);
    try {
      const version = await rpc(base, 'daemon.get_version', []);
      if (typeof version === 'string') return `Deluge ${version}`;
    } catch {
      // Older daemons don't expose get_version over the web API.
    }
    return 'Deluge (connected)';
  },
};
