import { baseUrl, type DownloaderClient, type DownloaderConfig } from './types';

const CHALLENGE_PATH = '/login/challenge.xml';
const LOGIN_PATH = '/login?page=interface.html';
const STATS_PATH = '/data/torrents.xml?L10n=no';
const ACTION_PATH = '/action';
const SUCCESS_MARKER = '<result>OK</result>';
const LOGIN_MARKER = 'KTorrent  WebInterface - Login';

async function sha1Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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
      headers: init?.headers,
    });
  } catch {
    throw new Error(`Could not reach KTorrent at ${baseUrl(config)}. Is the Web Interface running?`);
  }
}

function parseChallenge(xml: string): string {
  const challenge = xml.replace(/<.*?>/g, '').trim();
  if (challenge.length !== 20) {
    throw new Error('KTorrent did not return a valid login challenge.');
  }
  return challenge;
}

async function login(config: DownloaderConfig): Promise<void> {
  const challengeRes = await apiFetch(config, CHALLENGE_PATH);
  if (!challengeRes.ok) {
    throw new Error(`KTorrent login failed (HTTP ${challengeRes.status}).`);
  }
  const challenge = parseChallenge(await challengeRes.text());

  const body = new URLSearchParams({
    username: config.username,
    password: '',
    challenge: await sha1Hex(challenge + config.password),
  });
  const loginRes = await apiFetch(config, LOGIN_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!loginRes.ok) {
    throw new Error('Login failed. Check your KTorrent Web Interface username and password.');
  }
}

function assertActionResponse(text: string): void {
  if (text.includes(SUCCESS_MARKER)) return;
  if (text.includes(LOGIN_MARKER)) {
    throw new Error('Login failed. Check your KTorrent Web Interface username and password.');
  }
  throw new Error('KTorrent rejected the request.');
}

export const ktorrent: DownloaderClient = {
  name: 'KTorrent',
  needsUsername: true,
  supportsCategories: false,
  urlHint: 'Example: http://192.168.1.100:8080',

  async addMagnet(config, magnet) {
    await login(config);
    const params = new URLSearchParams({ load_torrent: magnet });
    const res = await apiFetch(config, `${ACTION_PATH}?${params.toString()}`);
    if (!res.ok) throw new Error(`KTorrent error (HTTP ${res.status}).`);
    assertActionResponse(await res.text());
  },

  async testConnection(config) {
    await login(config);
    const res = await apiFetch(config, STATS_PATH);
    if (!res.ok) throw new Error(`KTorrent error (HTTP ${res.status}).`);
    const text = await res.text();
    if (text.includes(LOGIN_MARKER)) {
      throw new Error('Login failed. Check your KTorrent Web Interface username and password.');
    }
    if (!text.includes('<torrents')) {
      throw new Error('KTorrent returned an unexpected response.');
    }
    return 'KTorrent (connected)';
  },
};
