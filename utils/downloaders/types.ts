export type DownloaderType = 'qbittorrent' | 'transmission' | 'deluge';

export interface DownloaderConfig {
  type: DownloaderType;
  url: string;
  username: string;
  password: string;
}

/** A saved downloader in the user's list. */
export interface DownloaderEntry extends DownloaderConfig {
  id: string;
  /** Optional user-given name, e.g. "Seedbox". Falls back to the client name. */
  label?: string;
  enabled: boolean;
}

export interface AddOptions {
  /** Category to file the torrent under. Clients without categories ignore it. */
  category?: string;
}

export interface DownloaderClient {
  /** Display name, e.g. "qBittorrent". */
  name: string;
  /** Whether the settings UI should show a username field. */
  needsUsername: boolean;
  /** Whether the client supports categories on add. */
  supportsCategories: boolean;
  /** Placeholder shown under the URL field in settings. */
  urlHint: string;
  /** Adds a magnet link. Throws with a user-friendly message on failure. */
  addMagnet(config: DownloaderConfig, magnet: string, options?: AddOptions): Promise<void>;
  /** Verifies the connection. Returns a version/status string on success. */
  testConnection(config: DownloaderConfig): Promise<string>;
}

export function baseUrl(config: DownloaderConfig): string {
  return config.url.trim().replace(/\/+$/, '');
}
