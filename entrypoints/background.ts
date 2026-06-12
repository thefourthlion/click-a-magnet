import { displayName, getClient } from '@/utils/downloaders';
import type { DownloaderEntry } from '@/utils/downloaders';
import { parseMagnetName } from '@/utils/magnet';
import {
  categoriesStorage,
  categoryForUrl,
  downloadersStorage,
  migrateLegacyConfig,
  preferredStorage,
  recentStorage,
  resolveTarget,
} from '@/utils/storage';
import type { Message, MessageResponse, ToastKind } from '@/utils/messages';

/** Leaf menu ids are `cam-send:` + JSON of this payload. */
const SEND_PREFIX = 'cam-send:';
const PARENT_ID = 'cam-parent';

interface SendPayload {
  /** Target downloader id. Absent = resolve preferred (used when nothing is configured). */
  d?: string;
  /** Explicit category. Absent = auto from domain rules. */
  c?: string;
}

export default defineBackground(() => {
  void migrateLegacyConfig().then(rebuildMenus);
  downloadersStorage.watch(() => void rebuildMenus());
  preferredStorage.watch(() => void rebuildMenus());
  categoriesStorage.watch(() => void rebuildMenus());

  browser.contextMenus.onClicked.addListener((info, tab) => {
    const id = String(info.menuItemId);
    if (!id.startsWith(SEND_PREFIX)) return;
    let payload: SendPayload;
    try {
      payload = JSON.parse(id.slice(SEND_PREFIX.length));
    } catch {
      return;
    }
    void onMenuClick(info.linkUrl, tab, payload);
  });

  browser.runtime.onMessage.addListener(
    (message: Message, sender, sendResponse: (res: MessageResponse) => void) => {
      // SHOW_TOAST is handled by content scripts, not here.
      if (message.type === 'SHOW_TOAST') return;
      handleMessage(message, sender.tab?.url ?? sender.url)
        .then(sendResponse)
        .catch((err) =>
          sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) }),
        );
      // Keep the message channel open for the async response.
      return true;
    },
  );
});

async function handleMessage(message: Message, sourceUrl?: string): Promise<MessageResponse> {
  switch (message.type) {
    case 'ADD_MAGNET':
      return addMagnet(message.magnet, { d: message.downloaderId }, sourceUrl);
    case 'TEST_CONNECTION': {
      const version = await getClient(message.config.type).testConnection(message.config);
      return { ok: true, data: version };
    }
    default:
      return { ok: false, error: 'Unknown message.' };
  }
}

/** Shared by the content script click flow and the context menu. */
async function addMagnet(
  magnet: string,
  payload: SendPayload,
  sourceUrl?: string,
): Promise<MessageResponse> {
  const target = await resolveTarget(payload.d);
  if (!target) {
    return { ok: false, error: 'No active downloader. Open the extension settings first.' };
  }
  const client = getClient(target.type);
  const category = client.supportsCategories
    ? (payload.c ?? (await categoryForUrl(sourceUrl)))
    : undefined;
  const name = displayName(target);
  try {
    await client.addMagnet(target, magnet, { category });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  await pushRecent(magnet, name);
  return { ok: true, data: category ? `${name} (${category})` : name };
}

async function onMenuClick(
  linkUrl: string | undefined,
  tab: { id?: number; url?: string } | undefined,
  payload: SendPayload,
) {
  const tabId = tab?.id;
  if (!linkUrl?.startsWith('magnet:')) {
    notifyTab(tabId, 'That link is not a magnet link.', 'error');
    return;
  }
  notifyTab(tabId, 'Sending to downloader…', 'info');
  const res = await addMagnet(linkUrl, payload, tab?.url);
  if (res.ok) notifyTab(tabId, `Added to ${res.data}`, 'success');
  else notifyTab(tabId, res.error, 'error');
}

function notifyTab(tabId: number | undefined, text: string, kind: ToastKind) {
  if (tabId === undefined) return;
  const message: Message = { type: 'SHOW_TOAST', text, kind };
  // Fails on pages without our content script (e.g. brave:// pages) — ignore.
  browser.tabs.sendMessage(tabId, message).catch(() => {});
}

/**
 * Menu shape:
 * - 0 active:  one item → error toast pointing at settings
 * - 1 active:  "Add to {name}" — with categories, it becomes a parent with
 *              "Auto / no category" + one child per category
 * - 2+ active: "Add to downloader" parent, one node per downloader (each of
 *              which nests categories the same way)
 */
async function rebuildMenus() {
  await browser.contextMenus.removeAll();
  const enabled = (await downloadersStorage.getValue()).filter((e) => e.enabled);
  const categories = await categoriesStorage.getValue();

  if (enabled.length === 0) {
    createMenu({ id: sendId({}), title: 'Add to downloader', contexts: ['link'] });
    return;
  }

  if (enabled.length === 1) {
    buildDownloaderNode(enabled[0], categories, undefined, `Add to ${displayName(enabled[0])}`);
    return;
  }

  createMenu({ id: PARENT_ID, title: 'Add to downloader', contexts: ['link'] });
  for (const entry of enabled) {
    buildDownloaderNode(entry, categories, PARENT_ID, displayName(entry));
  }
}

function buildDownloaderNode(
  entry: DownloaderEntry,
  categories: string[],
  parentId: string | undefined,
  title: string,
) {
  const cats = getClient(entry.type).supportsCategories ? categories : [];
  if (cats.length === 0) {
    createMenu({ id: sendId({ d: entry.id }), title, parentId, contexts: ['link'] });
    return;
  }
  const nodeId = `cam-node:${entry.id}`;
  createMenu({ id: nodeId, title, parentId, contexts: ['link'] });
  createMenu({
    id: sendId({ d: entry.id }),
    title: 'Auto / no category',
    parentId: nodeId,
    contexts: ['link'],
  });
  for (const category of cats) {
    createMenu({
      id: sendId({ d: entry.id, c: category }),
      title: category,
      parentId: nodeId,
      contexts: ['link'],
    });
  }
}

function sendId(payload: SendPayload): string {
  return `${SEND_PREFIX}${JSON.stringify(payload)}`;
}

type MenuProps = Parameters<typeof browser.contextMenus.create>[0];

function createMenu(props: MenuProps) {
  // Prefer limiting the menu to magnet links; fall back to all links if the
  // browser rejects the pattern (the click handler validates anyway).
  browser.contextMenus.create({ ...props, targetUrlPatterns: ['magnet:*'] }, () => {
    if (browser.runtime.lastError) {
      browser.contextMenus.create(props);
    }
  });
}

async function pushRecent(magnet: string, client: string): Promise<void> {
  const items = await recentStorage.getValue();
  items.unshift({ name: parseMagnetName(magnet), addedAt: Date.now(), client });
  await recentStorage.setValue(items.slice(0, 10));
}
