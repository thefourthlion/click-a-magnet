import { qbittorrent } from './qbittorrent';
import { transmission } from './transmission';
import { deluge } from './deluge';
import { rutorrent } from './rutorrent';
import { biglybt } from './biglybt';
import { tribler } from './tribler';
import { ktorrent } from './ktorrent';
import { aria2 } from './aria2';
import { utorrent } from './utorrent';
import { bittorrent } from './bittorrent';
import { flood } from './flood';
import { synology } from './synology';
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
  rutorrent,
  biglybt,
  tribler,
  ktorrent,
  aria2,
  utorrent,
  bittorrent,
  flood,
  synology,
};

export function getClient(type: DownloaderType): DownloaderClient {
  return downloaders[type] ?? downloaders.qbittorrent;
}

/** User-facing name for a saved downloader: custom label or the client name. */
export function displayName(entry: DownloaderEntry): string {
  return entry.label?.trim() || getClient(entry.type).name;
}
