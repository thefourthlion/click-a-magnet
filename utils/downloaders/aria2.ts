import { baseUrl, type DownloaderClient, type DownloaderConfig } from './types';

interface JsonRpcResponse {
  result?: unknown;
  error?: { code?: number; message?: string };
}

interface VersionResult {
  version?: string;
}

let requestId = 0;

function rpcUrl(config: DownloaderConfig): string {
  const base = baseUrl(config);
  if (base.endsWith('/jsonrpc') || base.endsWith('/rpc')) return base;
  return `${base}/jsonrpc`;
}

function withSecret(config: DownloaderConfig, params: unknown[]): unknown[] {
  if (config.password) return [`token:${config.password}`, ...params];
  return params;
}

async function rpc(
  config: DownloaderConfig,
  method: string,
  params: unknown[],
): Promise<unknown> {
  const url = rpcUrl(config);
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: String(++requestId),
        method,
        params: withSecret(config, params),
      }),
    });
  } catch {
    throw new Error(`Could not reach aria2 at ${baseUrl(config)}. Is the RPC server running?`);
  }
  if (!res.ok) throw new Error(`aria2 error (HTTP ${res.status}).`);

  const json = (await res.json()) as JsonRpcResponse;
  if (json.error) {
    const msg = json.error.message ?? 'unknown error';
    if (msg.includes('Unauthorized') || json.error.code === 1) {
      throw new Error('Login failed. Check your aria2 RPC secret.');
    }
    throw new Error(`aria2: ${msg}`);
  }
  return json.result;
}

export const aria2: DownloaderClient = {
  name: 'aria2',
  needsUsername: false,
  supportsCategories: false,
  urlHint: 'Example: http://192.168.1.100:6800',

  async addMagnet(config, magnet) {
    const gid = await rpc(config, 'aria2.addUri', [[magnet]]);
    if (typeof gid !== 'string' || !gid) {
      throw new Error('aria2 did not return a download id.');
    }
  },

  async testConnection(config) {
    const result = (await rpc(config, 'aria2.getVersion', [])) as VersionResult;
    const version = result.version?.trim();
    if (version) return `aria2 ${version}`;
    return 'aria2 (connected)';
  },
};
