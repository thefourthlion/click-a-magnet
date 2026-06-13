import { baseUrl, type DownloaderClient, type DownloaderConfig } from './types';

interface RpcResponse {
  result: string;
  arguments?: Record<string, unknown>;
}

/**
 * Transmission RPC with CSRF session-id handling: the first request returns
 * 409 with an X-Transmission-Session-Id header, then we retry with it.
 */
async function rpc(
  config: DownloaderConfig,
  method: string,
  args?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const url = `${baseUrl(config)}/transmission/rpc`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.username || config.password) {
    headers.Authorization = `Basic ${btoa(`${config.username}:${config.password}`)}`;
  }
  const body = JSON.stringify({ method, arguments: args ?? {} });

  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', credentials: 'include', headers, body });
    if (res.status === 409) {
      const sessionId = res.headers.get('X-Transmission-Session-Id');
      if (!sessionId) throw new Error('Transmission did not provide a session id.');
      res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { ...headers, 'X-Transmission-Session-Id': sessionId },
        body,
      });
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Transmission')) throw err;
    throw new Error(`Could not reach Transmission at ${baseUrl(config)}. Is the web interface running?`);
  }

  if (res.status === 401) throw new Error('Login failed. Check your username and password.');
  if (!res.ok) throw new Error(`Transmission error (HTTP ${res.status}).`);

  const json = (await res.json()) as RpcResponse;
  if (json.result !== 'success') throw new Error(`Transmission: ${json.result}`);
  return json.arguments ?? {};
}

export const transmission: DownloaderClient = {
  name: 'Transmission',
  needsUsername: true,
  supportsCategories: true,
  urlHint: 'Example: http://192.168.1.100:9091',

  async addMagnet(config, magnet, options) {
    const args: Record<string, unknown> = { filename: magnet };
    if (options?.category) args.labels = [options.category];
    await rpc(config, 'torrent-add', args);
  },

  async testConnection(config) {
    const args = await rpc(config, 'session-get');
    const version = typeof args.version === 'string' ? args.version : '';
    return `Transmission ${version}`.trim();
  },
};
