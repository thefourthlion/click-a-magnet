# Click a Magnet

A browser extension that sends magnet links straight to your torrent download client with one click. Built with [WXT](https://wxt.dev), React, and TypeScript.

## Features

- **One-click magnets** — click a `magnet:` link on any page; the extension sends it to your client instead of opening a handler
- **Right-click menu** — pick which downloader (and category) when you have several configured
- **Many clients** — qBittorrent, Transmission, Deluge, ruTorrent, BiglyBT, Tribler, KTorrent, aria2, µTorrent, BitTorrent, Flood, Synology Download Station (see [support list](./support-list.md))
- **Multiple downloaders** — save several servers (seedbox, NAS, desktop), toggle active/inactive, mark one as **preferred**
- **Categories** — file torrents under a label/category where the client supports it; right-click submenu or **site rules** (e.g. `example.com` → `audiobooks`)
- **On-page toasts** — success or error feedback without leaving the page
- **Popup** — connection status and recently added torrents
- **Settings page** — add/edit downloaders, test connection, manage categories and domain rules

## Supported clients

| Client | Categories |
|--------|------------|
| qBittorrent, Transmission, Deluge, ruTorrent | Yes |
| BiglyBT, µTorrent, BitTorrent, Flood | Yes (tags/labels) |
| Synology Download Station | Yes (destination folder path) |
| Tribler, KTorrent, aria2 | No |

Full compatibility notes, Docker test stacks, and verification status: **[support-list.md](./support-list.md)**

## Privacy

The extension stores downloader settings (including credentials) **only in your browser** and sends data **only** to download client URLs you configure. See **[PRIVACY.md](./PRIVACY.md)**.

## User setup

1. Enable the Web UI / remote API in your download client (e.g. qBittorrent: Tools → Options → Web UI).
2. Open the extension **Settings** (from the popup).
3. Click **+ Add Downloader**, choose your client, enter its address (e.g. `http://192.168.1.100:8080`) and credentials.
4. **Test Connection** → **Save**.
5. Visit a page with magnet links and click one, or right-click for client/category options.

## Development

### Prerequisites

- Node.js 18+
- `utils/downloaders/` — downloader client modules live here locally; that folder is **gitignored** and not published to GitHub. You need it on disk to build (copy from a release or your own checkout).

### Install & run

```bash
npm install
npm run dev
```

Load the unpacked extension:

- **Chrome:** `chrome://extensions` → Developer mode → Load unpacked → `.output/chrome-mv3`
- **Firefox:** `npm run dev:firefox` → `about:debugging` → Load Temporary Add-on → `.output/firefox-mv2`

### Build & package

```bash
npm run build          # production build → .output/
npm run zip            # Chrome zip for store/sideload
npm run zip:firefox    # Firefox zip
npm run compile        # type-check only
```

Integration smoke tests (requires local Docker stacks): `npx tsx scripts/test-downloaders.mts`

## Tech stack

- **WXT** — extension framework
- **React 19** — popup & options UI
- **TypeScript**

## Project layout

| Path | Purpose |
|------|---------|
| `entrypoints/background.ts` | Service worker — API calls, context menu |
| `entrypoints/content.ts` | Magnet link click interception |
| `entrypoints/popup/`, `entrypoints/options/` | UI |
| `utils/downloaders/` | Per-client API implementations (local only) |
| `utils/storage.ts` | Saved downloaders, categories, domain rules |
| `support-list.md` | Client compatibility matrix |
| `PRIVACY.md` | Privacy policy |

## License

See repository license file if present.
