import { storage } from 'wxt/utils/storage';
import type { DownloaderConfig, DownloaderEntry } from './downloaders/types';

export interface RecentItem {
  name: string;
  addedAt: number;
  /** Display name of the downloader it was sent to. */
  client?: string;
}

export const downloadersStorage = storage.defineItem<DownloaderEntry[]>('local:downloaders', {
  fallback: [],
});

/** Id of the preferred downloader — the default target for plain clicks. */
export const preferredStorage = storage.defineItem<string | null>('local:preferredDownloader', {
  fallback: null,
});

export const recentStorage = storage.defineItem<RecentItem[]>('local:recentTorrents', {
  fallback: [],
});

/** User-created category names (e.g. "audiobooks", "linux-isos"). */
export const categoriesStorage = storage.defineItem<string[]>('local:categories', {
  fallback: [],
});

/** Auto-assign a category to magnets clicked on a matching site. */
export interface DomainRule {
  domain: string;
  category: string;
}

export const domainRulesStorage = storage.defineItem<DomainRule[]>('local:domainRules', {
  fallback: [],
});

/** Looks up the category for the page a magnet was clicked on, if a rule matches. */
export async function categoryForUrl(url: string | undefined): Promise<string | undefined> {
  if (!url) return undefined;
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return undefined;
  }
  const rules = await domainRulesStorage.getValue();
  return rules.find((r) => host === r.domain || host.endsWith(`.${r.domain}`))?.category;
}

/**
 * Resolves where a magnet should go: an explicitly chosen entry, else the
 * preferred one (if enabled), else the first enabled entry.
 */
export async function resolveTarget(downloaderId?: string): Promise<DownloaderEntry | null> {
  const entries = await downloadersStorage.getValue();
  if (downloaderId) {
    return entries.find((e) => e.id === downloaderId) ?? null;
  }
  const enabled = entries.filter((e) => e.enabled);
  const preferredId = await preferredStorage.getValue();
  return enabled.find((e) => e.id === preferredId) ?? enabled[0] ?? null;
}

/** Converts configs saved under the old single-downloader keys into the list. */
export async function migrateLegacyConfig(): Promise<void> {
  const entries = await downloadersStorage.getValue();
  if (entries.length === 0) {
    const single = await storage.getItem<DownloaderConfig>('local:downloaderConfig');
    const qb = await storage.getItem<Omit<DownloaderConfig, 'type'>>('local:qbConfig');
    const seed: DownloaderConfig | null = single?.url
      ? single
      : qb?.url
        ? { type: 'qbittorrent', ...qb }
        : null;
    if (seed) {
      const entry: DownloaderEntry = { id: crypto.randomUUID(), enabled: true, ...seed };
      await downloadersStorage.setValue([entry]);
      await preferredStorage.setValue(entry.id);
    }
  }
  await storage.removeItem('local:downloaderConfig');
  await storage.removeItem('local:qbConfig');
}
