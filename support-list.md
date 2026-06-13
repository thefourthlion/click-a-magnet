# Click a Magnet — Downloader Support List

Compatibility matrix for the top 10 torrent clients, local Docker test stacks, and extension integration status.

**Legend**

| Extension status | Meaning |
|------------------|---------|
| **Supported** | Implemented in the extension; use **Test Connection** in settings |
| **Planned** | Docker stack exists for exploration; client module not written yet |
| **Not applicable** | No remote Web UI / API suitable for a browser extension |

| Verification | Meaning |
|--------------|---------|
| **Verified** | End-to-end test passed (Docker stack and/or real install — see notes) |
| **Unverified** | Code implemented and registered; not yet confirmed end-to-end in this project |

Supported clients without **Verified** should still work — treat **Test Connection** as the source of truth for your setup.

---

## Summary

| # | Client | Extension | Verified | Docker test | Categories |
|---|--------|-------------|----------|-------------|------------|
| 1 | qBittorrent | **Supported** | **Verified** | Yes | Yes |
| 2 | Transmission | **Supported** | **Verified** | Yes | Yes (labels) |
| 3 | Deluge | **Supported** | **Verified** | Yes | Yes (Label plugin) |
| 4 | rTorrent / ruTorrent | **Supported** | **Verified** | Yes | Yes (labels) |
| 5 | BiglyBT | **Supported** | Unverified | Yes | Yes (tags) |
| 6 | Tribler | **Supported** | Unverified | Yes | No |
| 7 | KTorrent | **Supported** | Unverified | No | No |
| 8 | LibreTorrent | Not applicable | — | No | — |
| 9 | Tixati | Not applicable | — | No | — |
| 10 | aria2 | **Supported** | Unverified | Yes | No |
| 11 | µTorrent | **Supported** | Unverified | Yes | Yes (labels) |
| 12 | BitTorrent | **Supported** | Unverified | No | Yes (labels) |
| 13 | Flood | **Supported** | Unverified | Yes | Yes (tags) |
| 14 | Synology Download Station | **Supported** | Unverified | No | Yes (destination) |

---

## 1. qBittorrent

| | |
|---|---|
| **Extension status** | **Supported** |
| **Verification** | **Verified** — remote qBittorrent v5.2.1 |
| **Implementation** | `utils/downloaders/qbittorrent.ts` |
| **Docker stack** | `utils/downloaders/qbittorrent/docker-compose.yml` |
| **Start** | `cd utils/downloaders/qbittorrent && docker compose up -d` |
| **Extension URL** | `http://localhost:8080` |
| **Credentials** | Username: `admin` · Password: `adminadmin` |
| **API** | Web UI v2 — `POST /api/v2/auth/login`, `POST /api/v2/torrents/add` |
| **Categories** | Yes — create via API; site rules + right-click submenu |
| **Notes** | Handles qBittorrent v4 (`200` + `Ok.`) and v5 (`204` empty body). Tested against remote v5.2.1. |

---

## 2. Transmission

| | |
|---|---|
| **Extension status** | **Supported** |
| **Verification** | **Verified** — linuxserver Docker on localhost:9091 |
| **Implementation** | `utils/downloaders/transmission.ts` |
| **Docker stack** | `utils/downloaders/transmission/docker-compose.yml` |
| **Start** | `cd utils/downloaders/transmission && docker compose up -d` |
| **Extension URL** | `http://localhost:9091` |
| **Credentials** | Username: `admin` · Password: `admin` |
| **API** | JSON-RPC at `/transmission/rpc` — Basic auth + `X-Transmission-Session-Id` CSRF |
| **Categories** | Yes — applied as Transmission labels on `torrent-add` |
| **Notes** | Method `torrent-add` with `{ filename: magnetUri, labels: [category] }`. Tested against linuxserver Docker on localhost:9091. |

---

## 3. Deluge

| | |
|---|---|
| **Extension status** | **Supported** |
| **Verification** | **Verified** — linuxserver Docker on localhost:8112 |
| **Implementation** | `utils/downloaders/deluge.ts` |
| **Docker stack** | `utils/downloaders/deluge/docker-compose.yml` |
| **Start** | `cd utils/downloaders/deluge && docker compose up -d` |
| **Extension URL** | `http://localhost:8112` |
| **Credentials** | Password only: `deluge` (default linuxserver web UI password) |
| **API** | JSON-RPC at `/json` — `auth.login`, `core.add_torrent_magnet` |
| **Categories** | Yes — Label plugin; extension auto-connects to daemon and applies labels |
| **Notes** | JSON-RPC at `/json`. Extension calls `web.connect` when needed, enables the Label plugin, then `label.set_torrent` after add. Tested against linuxserver Docker on localhost:8112. |

---

## 4. rTorrent / ruTorrent

| | |
|---|---|
| **Extension status** | **Supported** |
| **Verification** | **Verified** — linuxserver Docker on localhost:8081 |
| **Implementation** | `utils/downloaders/rutorrent.ts` |
| **Docker stack** | `utils/downloaders/rutorrent/docker-compose.yml` |
| **Start** | `cd utils/downloaders/rutorrent && docker compose up -d` |
| **Extension URL** | `http://localhost:8081` |
| **Credentials** | None by default (linuxserver image). Use HTTP basic auth if your install requires it. |
| **API** | `POST /php/addtorrent.php` (`url`, `label`, `json=1`); test via XML-RPC at `/RPC2` |
| **Categories** | Yes — applied as ruTorrent labels on add |
| **Notes** | Extension calls `/php/initplugins.php` first to link PHP to rTorrent. Subdirectory installs work — set the URL to your ruTorrent root (e.g. `http://host/rutorrent`). Tested against linuxserver Docker on localhost:8081. |

---

## 5. BiglyBT

| | |
|---|---|
| **Extension status** | **Supported** |
| **Verification** | **Unverified** — Docker stack exists; no recorded end-to-end pass |
| **Implementation** | `utils/downloaders/biglybt.ts` |
| **Docker stack** | `utils/downloaders/biglybt/docker-compose.yml` |
| **Start** | `cd utils/downloaders/biglybt && docker compose up -d` |
| **Extension URL** | `http://localhost:8082` |
| **Credentials** | `admin` / `admin` (azicen image defaults; set on first run in other installs) |
| **API** | Transmission-compatible JSON-RPC at `/transmission/rpc` (falls back to `/rpc`) |
| **Categories** | Yes — applied as BiglyBT tags via `vuze_tags` on `torrent-add` |
| **Notes** | Requires the XM Web UI / Web Remote plugin (bundled in test image). First boot can take several minutes. |

---

## 6. Tribler

| | |
|---|---|
| **Extension status** | **Supported** |
| **Verification** | **Unverified** — Docker stack exists; no recorded end-to-end pass |
| **Implementation** | `utils/downloaders/tribler.ts` |
| **Docker stack** | `utils/downloaders/tribler/docker-compose.yml` |
| **Start** | `cd utils/downloaders/tribler && docker compose up -d` |
| **Extension URL** | `http://localhost:8085` |
| **Credentials** | API key only — test stack uses `click-a-magnet-test` (see `CORE_API_KEY` in compose) |
| **API** | REST at `/api/downloads` — `PUT` with `{ uri: magnet }`, auth via `X-Api-Key` header |
| **Categories** | No — Tribler REST API has no category field on add |
| **Notes** | Docker entrypoint patches `http_host` to `0.0.0.0` so port mapping works. Find your API key in Tribler Settings → General → API, or `configuration.json` → `api.key`. First boot can take 1–2 minutes. |

---

## 7. KTorrent

| | |
|---|---|
| **Extension status** | **Supported** |
| **Verification** | **Unverified** — no Docker stack; needs manual test on a live KTorrent instance |
| **Implementation** | `utils/downloaders/ktorrent.ts` |
| **Docker stack** | None — see `utils/downloaders/ktorrent/README.md` |
| **Platform** | KDE desktop (Linux) with Web Interface plugin |
| **Extension URL** | Your Web Interface port, e.g. `http://192.168.1.100:8080` |
| **Credentials** | Username + password (set in KTorrent → Configure → Web Interface) |
| **API** | Web Interface plugin — challenge login, `GET /action?load_torrent=…` |
| **Categories** | No — groups are desktop-only; the Web Interface API has no group field on add |
| **Notes** | Enable the Web Interface plugin and **Login required**. Requires PHP. No Docker stack; test on a live KTorrent instance. |

---

## 8. LibreTorrent

| | |
|---|---|
| **Extension status** | **Not applicable** |
| **Docker stack** | None — see `utils/downloaders/libretorrent/README.md` |
| **Platform** | Android only |
| **Reason** | Mobile app; no desktop Web UI to target from a Chrome extension |

---

## 9. Tixati

| | |
|---|---|
| **Extension status** | **Not applicable** |
| **Docker stack** | None — see `utils/downloaders/tixati/README.md` |
| **Platform** | Windows (primary) |
| **Reason** | No documented public Web UI API for third-party tools |

---

## 10. aria2

| | |
|---|---|
| **Extension status** | **Supported** |
| **Verification** | **Unverified** — in `scripts/test-downloaders.mts`; no recorded end-to-end pass |
| **Implementation** | `utils/downloaders/aria2.ts` |
| **Docker stack** | `utils/downloaders/aria2/docker-compose.yml` |
| **Start** | `cd utils/downloaders/aria2 && docker compose up -d` |
| **Extension URL** | `http://localhost:6800` (RPC base; `/jsonrpc` is appended automatically) |
| **AriaNg UI** | `http://localhost:8084` |
| **Credentials** | RPC secret only — test stack uses `click-a-magnet-test` |
| **API** | JSON-RPC at `/jsonrpc` — `aria2.addUri`, auth via `token:<secret>` param |
| **Categories** | No |
| **Notes** | Downloader daemon, not a full torrent client UI; magnets added via RPC. |

---

## 11. µTorrent

| | |
|---|---|
| **Extension status** | **Supported** |
| **Verification** | **Unverified** — in `scripts/test-downloaders.mts`; Docker image is linux/amd64 only |
| **Implementation** | `utils/downloaders/utorrent.ts` |
| **Docker stack** | `utils/downloaders/utorrent/docker-compose.yml` |
| **Start** | `cd utils/downloaders/utorrent && docker compose up -d` |
| **Extension URL** | `http://localhost:8087` |
| **Credentials** | Username: `admin` · Password: blank by default (set in Web UI) |
| **API** | Web UI at `/gui/` — token from `/gui/token.html`, `action=add-url`, labels via `setprops` |
| **Categories** | Yes — applied as µTorrent labels after add |
| **Notes** | Enable Web UI in µTorrent settings. Token auth is required on modern builds. Test image (`ekho/utorrent`) is linux/amd64 only. |

---

## 12. BitTorrent

| | |
|---|---|
| **Extension status** | **Supported** |
| **Verification** | **Unverified** — shares µTorrent Web UI code; no separate desktop test recorded |
| **Implementation** | `utils/downloaders/bittorrent.ts` (shared Web UI API with µTorrent) |
| **Docker stack** | None — desktop client; API-compatible with `utils/downloaders/utorrent/` test stack |
| **Platform** | Windows / macOS desktop |
| **Extension URL** | Your Web UI port, e.g. `http://192.168.1.100:8080` |
| **Credentials** | Web UI username + password (set in BitTorrent preferences) |
| **API** | Same Web UI API as µTorrent — `/gui/token.html`, `action=add-url`, labels via `setprops` |
| **Categories** | Yes — applied as BitTorrent labels after add |
| **Notes** | Enable **Web UI** in BitTorrent preferences. Uses the same backend as µTorrent. |

---

## 13. Flood

| | |
|---|---|
| **Extension status** | **Supported** |
| **Verification** | **Unverified** — in `scripts/test-downloaders.mts`; local Docker stack not confirmed |
| **Implementation** | `utils/downloaders/flood.ts` |
| **Docker stack** | `utils/downloaders/flood/docker-compose.yml` |
| **Start** | `cd utils/downloaders/flood && docker compose up -d` |
| **Extension URL** | `http://localhost:8088` |
| **Credentials** | Username + password (test stack uses `--auth none` — leave both blank) |
| **API** | REST — `POST /api/auth/authenticate`, `POST /api/torrents/add-urls` |
| **Categories** | Yes — applied as Flood **tags** on add |
| **Notes** | Web UI for rTorrent (also supports qBittorrent, Transmission, Deluge). Test stack bundles rTorrent via `jesec/rtorrent-flood`. |

---

## 14. Synology Download Station

| | |
|---|---|
| **Extension status** | **Supported** |
| **Verification** | **Unverified** — no Docker stack; implemented from Synology API docs / Sonarr reference; needs real NAS test |
| **Implementation** | `utils/downloaders/synology.ts` |
| **Docker stack** | None — see `utils/downloaders/synology/README.md` |
| **Extension URL** | `http://192.168.x.x:5000` or `https://192.168.x.x:5001` (your DSM address) |
| **Credentials** | DSM username + password (Download Station session) |
| **API** | Synology Web API — `SYNO.API.Auth` login, `SYNO.DownloadStation2.Task` (DSM 7+) or `SYNO.DownloadStation.Task` (legacy) |
| **Categories** | Yes — applied as Download Station **destination** folder (shared-folder path, e.g. `download` or `Media/TV`) |
| **Notes** | Requires a Synology NAS on your LAN; no headless Docker test stack. DSM 7 often requires an explicit destination — set a default in Download Station for the user or use categories. Accounts with 2FA need an app password. |

---

## Port map (run multiple stacks at once)

| Client | Web / API port | BitTorrent peer port (host) |
|--------|----------------|----------------------------|
| qBittorrent | 8080 | 6881 |
| Transmission | 9091 | 51413 |
| Deluge | 8112 | 6882 |
| ruTorrent | 8081 | 6883 |
| BiglyBT | 8082 | 6884 |
| Tribler | 8085 | (internal) |
| aria2 RPC / UI | 6800 / 8084 | 6885 |
| µTorrent | 8087 | 6887 |
| Flood | 8088 | 6888 |

---

## Testing the extension against a stack

1. Start a stack (e.g. qBittorrent).
2. Open **Click a Magnet → Settings → + Add Downloader**.
3. Enter the **Extension URL** and credentials from the table above.
4. **Test Connection** → **Save**.
5. Visit a page with magnet links (e.g. [webtorrent.io/free-torrents](https://webtorrent.io/free-torrents)) and click a magnet link.

### Automated smoke test

```bash
# Start the Docker stacks you want to test, then:
npx tsx scripts/test-downloaders.mts

# Optional manual clients:
KTORRENT_URL=http://host:port KTORRENT_USER=… KTORRENT_PASS=… npx tsx scripts/test-downloaders.mts
SYNOLOGY_URL=http://nas:5000 SYNOLOGY_USER=… SYNOLOGY_PASS=… SYNOLOGY_DEST=download npx tsx scripts/test-downloaders.mts
```

After a client passes, update its **Verification** row here from **Unverified** to **Verified** with the environment tested.

---

## Adding a new client to the extension

1. Add `utils/downloaders/{name}.ts` implementing `DownloaderClient`.
2. Register in `utils/downloaders/index.ts` and `DownloaderType`.
3. Add a Docker stack under `utils/downloaders/{name}/` if a headless/Web UI image exists.
4. Update this file and `utils/downloaders/README.md`.

---

*Last updated: extension v1.0.0 — 14 clients implemented; 4 verified (qBittorrent, Transmission, Deluge, ruTorrent); 10 supported but unverified.*
