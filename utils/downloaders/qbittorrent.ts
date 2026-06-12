import { baseUrl, type DownloaderClient, type DownloaderConfig } from './types';

/**
 * Logs into the qBittorrent Web UI. On success the browser stores the SID
 * cookie for the server origin, which subsequent requests send automatically.
 */
async function login(config: DownloaderConfig): Promise<string> {
  const base = baseUrl(config);
  let res: Response;
  try {
    res = await fetch(`${base}/api/v2/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        username: config.username,
        password: config.password,
      }),
    });
  } catch {
    throw new Error(`Could not reach qBittorrent at ${base}. Is the Web UI running?`);
  }
  if (res.status === 401) {
    throw new Error('Login failed. Check your username and password.');
  }
  if (res.status === 403) {
    throw new Error('Login blocked by qBittorrent (too many failed attempts). Wait a bit or restart qBittorrent.');
  }
  // qBittorrent <= 4.x returns 200 with "Ok."/"Fails."; 5.x returns 204 with
  // an empty body on success and 401 on bad credentials.
  const text = (await res.text()).trim();
  if (!res.ok || text === 'Fails.') {
    throw new Error('Login failed. Check your username and password.');
  }
  return base;
}

export const qbittorrent: DownloaderClient = {
  name: 'qBittorrent',
  needsUsername: true,
  supportsCategories: true,
  urlHint: 'Example: http://192.168.1.100:8080',

  async addMagnet(config, magnet, options) {
    const base = await login(config);

    if (options?.category) {
      // Make sure the category exists; 409 = already exists, which is fine.
      const createForm = new FormData();
      createForm.set('category', options.category);
      createForm.set('savePath', '');
      await fetch(`${base}/api/v2/torrents/createCategory`, {
        method: 'POST',
        credentials: 'include',
        body: createForm,
      }).catch(() => {});
    }

    const form = new FormData();
    form.set('urls', magnet);
    if (options?.category) form.set('category', options.category);
    const res = await fetch(`${base}/api/v2/torrents/add`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    const text = (await res.text()).trim();
    if (!res.ok) throw new Error(`qBittorrent error (HTTP ${res.status}).`);
    if (text === 'Fails.') throw new Error('qBittorrent rejected the torrent.');
  },

  async testConnection(config) {
    const base = await login(config);
    const res = await fetch(`${base}/api/v2/app/version`, { credentials: 'include' });
    if (!res.ok) {
      throw new Error(`Logged in, but version check failed (HTTP ${res.status}).`);
    }
    return `qBittorrent ${(await res.text()).trim()}`;
  },
};
