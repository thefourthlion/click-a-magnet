import { baseUrl, type DownloaderClient, type DownloaderConfig } from './types';

interface ListResponse {
  build?: number;
  torrents?: unknown[][];
}

function guiRoot(config: DownloaderConfig): string {
  const base = baseUrl(config);
  if (base.endsWith('/gui')) return base;
  return `${base}/gui`;
}

function authHeaders(config: DownloaderConfig): Record<string, string> {
  if (!config.username && !config.password) return {};
  return { Authorization: `Basic ${btoa(`${config.username}:${config.password}`)}` };
}

function parseToken(html: string, clientName: string): string {
  const token = html.replace(/<.*?>/g, '').trim();
  if (!token) throw new Error(`Could not get a Web UI token from ${clientName}.`);
  return token;
}

function magnetInfoHash(magnet: string): string | null {
  const hex = /btih:([0-9a-fA-F]{40})/i.exec(magnet)?.[1];
  if (hex) return hex.toUpperCase();
  return null;
}

function createClient(clientName: string): DownloaderClient {
  async function fetchToken(config: DownloaderConfig): Promise<string> {
    let res: Response;
    try {
      res = await fetch(`${guiRoot(config)}/token.html`, {
        credentials: 'include',
        headers: authHeaders(config),
      });
    } catch {
      throw new Error(`Could not reach ${clientName} at ${baseUrl(config)}. Is the Web UI running?`);
    }
    if (res.status === 401) {
      throw new Error(`Login failed. Check your ${clientName} Web UI username and password.`);
    }
    if (!res.ok) throw new Error(`${clientName} error (HTTP ${res.status}).`);
    return parseToken(await res.text(), clientName);
  }

  async function guiGet(
    config: DownloaderConfig,
    token: string,
    params: Record<string, string>,
    allowRetry = true,
  ): Promise<Response> {
    const search = new URLSearchParams({ token, ...params });
    const res = await fetch(`${guiRoot(config)}/?${search}`, {
      credentials: 'include',
      headers: authHeaders(config),
    });
    if (allowRetry && (res.status === 400 || res.status === 300)) {
      const body = await res.text();
      if (/invalid request/i.test(body)) {
        const nextToken = await fetchToken(config);
        return guiGet(config, nextToken, params, false);
      }
      throw new Error(`${clientName} rejected the request (invalid token).`);
    }
    if (res.status === 401) {
      throw new Error(`Login failed. Check your ${clientName} Web UI username and password.`);
    }
    return res;
  }

  async function withToken<T>(
    config: DownloaderConfig,
    fn: (token: string) => Promise<T>,
  ): Promise<T> {
    return fn(await fetchToken(config));
  }

  async function applyLabel(
    config: DownloaderConfig,
    token: string,
    hash: string,
    label: string,
  ): Promise<void> {
    const res = await guiGet(config, token, {
      action: 'setprops',
      hash,
      s: 'label',
      v: label,
    });
    if (!res.ok) throw new Error(`${clientName} error (HTTP ${res.status}).`);
  }

  async function findTorrentHash(
    config: DownloaderConfig,
    token: string,
    magnet: string,
  ): Promise<string | null> {
    const target = magnetInfoHash(magnet);
    if (!target) return null;

    const res = await guiGet(config, token, { list: '1' });
    if (!res.ok) throw new Error(`${clientName} error (HTTP ${res.status}).`);

    const data = (await res.json()) as ListResponse;
    for (const row of data.torrents ?? []) {
      if (!Array.isArray(row) || typeof row[0] !== 'string') continue;
      if (row[0].toUpperCase() === target) return row[0];
    }
    return null;
  }

  return {
    name: clientName,
    needsUsername: true,
    supportsCategories: true,
    urlHint: 'Example: http://192.168.1.100:8080',

    async addMagnet(config, magnet, options) {
      await withToken(config, async (token) => {
        const res = await guiGet(config, token, {
          action: 'add-url',
          s: magnet,
        });
        if (!res.ok) throw new Error(`${clientName} error (HTTP ${res.status}).`);

        if (options?.category) {
          const hash = await findTorrentHash(config, token, magnet);
          if (hash) await applyLabel(config, token, hash, options.category);
        }
      });
    },

    async testConnection(config) {
      return withToken(config, async (token) => {
        const res = await guiGet(config, token, { list: '1' });
        if (!res.ok) throw new Error(`${clientName} error (HTTP ${res.status}).`);
        const data = (await res.json()) as ListResponse;
        if (typeof data.build === 'number') return `${clientName} (build ${data.build})`;
        return `${clientName} (connected)`;
      });
    },
  };
}

export const utorrent = createClient('µTorrent');
export const bittorrent = createClient('BitTorrent');
