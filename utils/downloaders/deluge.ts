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
  await ensureConnected(base);
  return base;
}

/** Connect the Web UI to the first configured daemon host if needed. */
async function ensureConnected(base: string): Promise<void> {
  if (await rpc(base, 'web.connected', [])) return;
  const hosts = (await rpc(base, 'web.get_hosts', [])) as unknown;
  if (!Array.isArray(hosts) || hosts.length === 0) {
    throw new Error('Deluge Web UI has no daemon hosts configured.');
  }
  const hostId = (hosts[0] as unknown[])[0];
  if (typeof hostId !== 'string') {
    throw new Error('Deluge daemon host id is missing.');
  }
  await rpc(base, 'web.connect', [hostId]);
  if (!(await rpc(base, 'web.connected', []))) {
    throw new Error('Could not connect Deluge Web UI to its daemon.');
  }
}

async function ensureLabelPlugin(base: string): Promise<void> {
  const enabled = (await rpc(base, 'core.get_enabled_plugins', [])) as unknown;
  if (Array.isArray(enabled) && enabled.includes('Label')) return;
  await rpc(base, 'core.enable_plugin', ['Label']);
}

async function applyLabel(base: string, hash: string, label: string): Promise<void> {
  await ensureLabelPlugin(base);
  try {
    await rpc(base, 'label.add', [label]);
  } catch {
    // Label may already exist.
  }
  await rpc(base, 'label.set_torrent', [hash, label]);
}

export const deluge: DownloaderClient = {
  name: 'Deluge',
  needsUsername: false,
  supportsCategories: true,
  urlHint: 'Example: http://192.168.1.100:8112',

  async addMagnet(config, magnet, options) {
    const base = await login(config);
    const hash = await rpc(base, 'core.add_torrent_magnet', [magnet, {}]);
    if (options?.category && typeof hash === 'string') {
      await applyLabel(base, hash, options.category);
    }
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
