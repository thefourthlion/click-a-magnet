import { baseUrl, type DownloaderClient, type DownloaderConfig } from './types';

function authHeaders(config: DownloaderConfig): Record<string, string> {
  if (!config.username && !config.password) return {};
  return { Authorization: `Basic ${btoa(`${config.username}:${config.password}`)}` };
}

async function fetchRuTorrent(
  config: DownloaderConfig,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = `${baseUrl(config)}${path}`;
  try {
    return await fetch(url, {
      ...init,
      credentials: 'include',
      headers: { ...authHeaders(config), ...init?.headers },
    });
  } catch {
    throw new Error(`Could not reach ruTorrent at ${baseUrl(config)}. Is the Web UI running?`);
  }
}

/** Warm the PHP ↔ rTorrent link (same as opening the Web UI once). */
async function ensureLinked(config: DownloaderConfig): Promise<void> {
  const res = await fetchRuTorrent(config, '/php/initplugins.php');
  if (res.status === 401) throw new Error('Login failed. Check your username and password.');
  if (!res.ok) throw new Error(`ruTorrent error (HTTP ${res.status}).`);
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function parseXmlRpcString(xml: string): string | null {
  return /<string>([^<]*)<\/string>/.exec(xml)?.[1] ?? null;
}

function parseXmlRpcFault(xml: string): string | null {
  return /<name>faultString<\/name>\s*<value><string>([^<]*)<\/string>/.exec(xml)?.[1] ?? null;
}

async function xmlRpc(config: DownloaderConfig, method: string, params: string[]): Promise<string> {
  const paramXml = params
    .map((p) => `<param><value><string>${escapeXml(p)}</string></value></param>`)
    .join('');
  const body = `<?xml version="1.0"?><methodCall><methodName>${method}</methodName><params>${paramXml}</params></methodCall>`;
  const res = await fetchRuTorrent(config, '/RPC2', {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml' },
    body,
  });
  if (res.status === 401) throw new Error('Login failed. Check your username and password.');
  if (!res.ok) throw new Error(`ruTorrent RPC error (HTTP ${res.status}).`);
  const text = await res.text();
  const fault = parseXmlRpcFault(text);
  if (fault) throw new Error(`ruTorrent: ${fault}`);
  const value = parseXmlRpcString(text);
  if (!value) throw new Error('ruTorrent returned an unexpected RPC response.');
  return value;
}

export const rutorrent: DownloaderClient = {
  name: 'ruTorrent',
  needsUsername: true,
  supportsCategories: true,
  urlHint: 'Example: http://192.168.1.100:8080',

  async addMagnet(config, magnet, options) {
    await ensureLinked(config);
    const form = new URLSearchParams({ json: '1', url: magnet });
    if (options?.category) form.set('label', options.category);
    const res = await fetchRuTorrent(config, '/php/addtorrent.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      redirect: 'follow',
    });
    if (res.status === 401) throw new Error('Login failed. Check your username and password.');
    if (!res.ok) throw new Error(`ruTorrent error (HTTP ${res.status}).`);
    let json: { result?: string };
    try {
      json = (await res.json()) as { result?: string };
    } catch {
      throw new Error('ruTorrent returned an unexpected response when adding the torrent.');
    }
    if (json.result !== 'Success') {
      throw new Error(`ruTorrent rejected the torrent (${json.result ?? 'unknown'}).`);
    }
  },

  async testConnection(config) {
    await ensureLinked(config);
    const version = await xmlRpc(config, 'system.client_version', []);
    return `ruTorrent (rTorrent ${version})`;
  },
};
