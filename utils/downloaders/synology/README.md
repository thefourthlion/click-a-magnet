# Synology Download Station

Synology **Download Station** exposes a Web API on DSM (typically `http://nas:5000` or `https://nas:5001`).

## Extension status

**Supported** — `utils/downloaders/synology.ts`

## Docker

No practical headless DSM stack for local extension testing. Test against a real Synology NAS on your LAN.

## Settings

| Field | Value |
|-------|-------|
| **URL** | Your DSM base URL, e.g. `http://192.168.1.100:5000` |
| **Username** | DSM account with Download Station access |
| **Password** | DSM password (use an app password if 2FA is enabled) |

## Categories

Categories map to Download Station **destination** paths — shared-folder paths such as `download` or `Media/TV`, not labels or tags.

On DSM 7 / Download Station 4.x the v2 API often requires a destination even when the UI has a default. If adds fail with a destination error:

1. Log into DSM as the same user, open Download Station → Settings → BT/HTTP/FTP/NZB → set **Location**, or
2. Configure a category in Click a Magnet (site rules or right-click submenu) with the folder path.

## API notes

- Auth: `GET /webapi/auth.cgi` — `SYNO.API.Auth` with `session=DownloadStation` and `format=sid`
- Test: `SYNO.DownloadStation.Info` `getinfo` → version string
- Add magnet (v2): `GET /webapi/DownloadStation/entry.cgi` — `SYNO.DownloadStation2.Task` `create` with `type=url`
- Add magnet (legacy): `GET /webapi/DownloadStation/task.cgi` — `SYNO.DownloadStation.Task` `create` with `uri=`

The client probes `SYNO.API.Info` and picks v1 or v2 automatically.
