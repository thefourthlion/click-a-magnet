import { qbittorrent } from './qbittorrent';
import { transmission } from './transmission';
import { deluge } from './deluge';
import type { DownloaderClient, DownloaderEntry, DownloaderType } from './types';

export type {
  DownloaderClient,
  DownloaderConfig,
  DownloaderEntry,
  DownloaderType,
} from './types';

export const downloaders: Record<DownloaderType, DownloaderClient> = {
  qbittorrent,
  transmission,
  deluge,
};

export function getClient(type: DownloaderType): DownloaderClient {
  return downloaders[type] ?? downloaders.qbittorrent;
}

/** User-facing name for a saved downloader: custom label or the client name. */
export function displayName(entry: DownloaderEntry): string {
  return entry.label?.trim() || getClient(entry.type).name;
}
