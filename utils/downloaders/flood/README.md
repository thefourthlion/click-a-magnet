# Flood — rTorrent Web UI

[Flood](https://github.com/jesec/flood) is a modern web UI that talks to **rTorrent** (and other clients) over its REST API.

## Extension status

**Supported** — implementation in `utils/downloaders/flood.ts`.

## Docker test stack

```bash
cd utils/downloaders/flood && docker compose up -d
```

| | |
|---|---|
| **Extension URL** | `http://localhost:8088` |
| **Credentials** | blank username/password (`--auth none` in compose) |

Uses the `jesec/rtorrent-flood` all-in-one image (Flood + rTorrent).

## Manual setup

1. Install Flood and connect it to your torrent client (rTorrent socket path, qBittorrent Web UI, etc.).
2. Create a Flood user account (unless running with `--auth none`).
3. In Click a Magnet settings, add a **Flood** entry with your Flood URL and credentials.

## API

| Step | Request |
|------|---------|
| Login | `POST /api/auth/authenticate` — sets `jwt` cookie |
| Add magnet | `POST /api/torrents/add-urls` — `{ urls: [magnet], tags?, start: true }` |
| Test | `GET /api/client/connection-test` after login |

OpenAPI docs are at `/api/docs` on your Flood instance.

## Categories

Yes — passed as **tags** on add (Flood tag names cannot contain commas).
