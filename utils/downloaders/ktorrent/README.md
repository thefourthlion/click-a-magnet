# KTorrent — manual testing only

KTorrent is a **KDE desktop application** for Linux. Remote control is provided by the optional **Web Interface** plugin (PHP), not a headless Docker stack.

## Extension status

**Supported** — implementation in `utils/downloaders/ktorrent.ts`.

## Setup

1. Install KTorrent on a Linux machine.
2. Enable the **Web Interface** plugin (Plugins toolbar).
3. Open **Configure KTorrent → Web Interface**:
   - Set a port (e.g. `8080`).
   - Enable **Login required** and set username/password.
   - Ensure the **PHP executable path** is configured.
4. In Click a Magnet settings, add a KTorrent entry with your Web Interface URL and credentials.

## API (Web Interface plugin)

| Step | Request |
|------|---------|
| Challenge | `GET /login/challenge.xml` |
| Login | `POST /login?page=interface.html` — `username`, empty `password`, `challenge` = SHA1(challenge + password) as lowercase hex |
| Add magnet | `GET /action?load_torrent=<url-encoded magnet>` |
| Test | `GET /data/torrents.xml?L10n=no` after login |

Session cookies (`KT_SESSID`) are required on subsequent requests.

## Categories

No — the Web Interface API does not expose group assignment when adding torrents (KTorrent desktop groups are not available remotely).

## Docker

No Docker test stack — KTorrent requires KDE, PHP, and a desktop session. Test against a live KTorrent instance on your LAN.
