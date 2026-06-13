# Downloader test stacks

Docker Compose files for spinning up torrent clients locally while developing and testing **Click a Magnet**.

## Supported by the extension (implementations in `*.ts`)

See [support-list.md](../../support-list.md) for **Verified** vs **Unverified** status.

| Folder | Verified | Command | Extension URL | Credentials |
|--------|----------|---------|---------------|-------------|
| [qbittorrent](./qbittorrent/) | Yes | `docker compose up -d` | `http://localhost:8080` | `admin` / `adminadmin` |
| [transmission](./transmission/) | Yes | `docker compose up -d` | `http://localhost:9091` | `admin` / `admin` |
| [deluge](./deluge/) | Yes | `docker compose up -d` | `http://localhost:8112` | password: `deluge` |
| [rutorrent](./rutorrent/) | Yes | `docker compose up -d` | `http://localhost:8081` | none by default |
| [biglybt](./biglybt/) | No | `docker compose up -d` | `http://localhost:8082` | `admin` / `admin` |
| [tribler](./tribler/) | No | `docker compose up -d` | `http://localhost:8085` | API key: `click-a-magnet-test` |
| [ktorrent](./ktorrent/) | No | manual only | your Web Interface URL | username + password from plugin settings |
| [aria2](./aria2/) | No | `docker compose up -d` | `http://localhost:6800` | RPC secret: `click-a-magnet-test` |
| [utorrent](./utorrent/) | No | `docker compose up -d` | `http://localhost:8087` | `admin` / blank password |
| [flood](./flood/) | No | `docker compose up -d` | `http://localhost:8088` | blank (`--auth none` in test stack) |

BitTorrent uses the same Web UI API — test against the µTorrent stack above or a desktop install (unverified).

| [synology](./synology/) | No | manual only | your DSM URL (`:5000` / `:5001`) | DSM username + password |

## No Docker stack (platform limits)

| Folder | Reason |
|--------|--------|
| [libretorrent](./libretorrent/) | Android only |
| [tixati](./tixati/) | Windows desktop, no remote API |

## Usage

```bash
cd utils/downloaders/qbittorrent   # pick a client
docker compose up -d
docker compose logs -f             # optional
docker compose down                # stop
```

Each stack uses its own host ports so you can run **qBittorrent + Transmission + Deluge** at the same time. Peer ports are offset (`6881`, `6882`, …) to avoid conflicts.

Config and downloads are written to `./config` and `./downloads` inside each folder (gitignored).

See [support-list.md](../../support-list.md) at the repo root for full compatibility details.
