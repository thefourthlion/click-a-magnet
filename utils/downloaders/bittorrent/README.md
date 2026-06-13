# BitTorrent — desktop Web UI

The **BitTorrent** desktop client exposes the same Web UI API as **µTorrent** (`/gui/` endpoints, token auth).

## Extension status

**Supported** — implementation in `utils/downloaders/bittorrent.ts` (shared logic with `utorrent.ts`).

## Setup

1. Install BitTorrent on Windows or macOS.
2. Enable **Web UI** in Preferences → Web UI.
3. Set username/password and note the port (default often `8080`).
4. In Click a Magnet settings, add a **BitTorrent** entry with your Web UI URL and credentials.

## Docker testing

No dedicated image — the µTorrent test stack (`utils/downloaders/utorrent/`) speaks the same API if you need to smoke-test the integration on linux/amd64.

## Categories

Yes — labels applied via `setprops&s=label` after add (same as µTorrent).
