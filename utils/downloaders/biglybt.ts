import { baseUrl, type DownloaderClient, type DownloaderConfig } from './types';

interface RpcResponse {
  result: string;
  arguments?: Record<string, unknown>;
}

const RPC_PATHS = ['/transmission/rpc', '/rpc'];

/**
 * BiglyBT's XM Web UI plugin exposes a Transmission-compatible JSON-RPC API.
 * CSRF handling matches Transmission: first POST may return 409 + session id.
 */
async function rpc(
  config: DownloaderConfig,
  method: string,
  args?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const base = baseUrl(config);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.username || config.password) {
    headers.Authorization = `Basic ${btoa(`${config.username}:${config.password}`)}`;
  }
  const body = JSON.stringify({ method, arguments: args ?? {} });

  let lastError: Error | null = null;
  for (const path of RPC_PATHS) {
    const url = `${base}${path}`;
    try {
      let res = await fetch(url, { method: 'POST', credentials: 'include', headers, body });
      if (res.status === 409) {
        const sessionId = res.headers.get('X-Transmission-Session-Id');
        if (!sessionId) throw new Error('BiglyBT did not provide a session id.');
        res = await fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: { ...headers, 'X-Transmission-Session-Id': sessionId },
          body,
        });
      }
      if (res.status === 404 && path !== RPC_PATHS[RPC_PATHS.length - 1]) continue;
      if (res.status === 401) throw new Error('Login failed. Check your username and password.');
      if (!res.ok) throw new Error(`BiglyBT error (HTTP ${res.status}).`);

      const json = (await res.json()) as RpcResponse;
      if (json.result !== 'success') throw new Error(`BiglyBT: ${json.result}`);
      return json.arguments ?? {};
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Login failed')) throw err;
      if (err instanceof Error && err.message.startsWith('BiglyBT')) throw err;
      lastError =
        err instanceof Error
          ? err
          : new Error(`Could not reach BiglyBT at ${base}. Is the Web UI running?`);
    }
  }

  throw lastError ?? new Error(`Could not reach BiglyBT at ${base}. Is the Web UI running?`);
}

export const biglybt: DownloaderClient = {
  name: 'BiglyBT',
  needsUsername: true,
  supportsCategories: true,
  urlHint: 'Example: http://192.168.1.100:9091',

  async addMagnet(config, magnet, options) {
    const args: Record<string, unknown> = { filename: magnet };
    if (options?.category) args.vuze_tags = [options.category];
    await rpc(config, 'torrent-add', args);
  },

  async testConnection(config) {
    const args = await rpc(config, 'session-get');
    const version =
      typeof args['biglybt-version'] === 'string'
        ? args['biglybt-version']
        : typeof args.version === 'string'
          ? args.version
          : '';
    return `BiglyBT ${version}`.trim();
  },
};
