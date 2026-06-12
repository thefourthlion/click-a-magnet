# Click a Magnet

A browser extension that sends magnet links straight to your torrent download client with one click. Built with [WXT](https://wxt.dev), React, and TypeScript.

## Features

- Click any magnet link on any page — it's sent to your download client instead of opening
- Right-click a magnet link → **Add to {your client}**; with multiple active downloaders, pick one from the submenu
- Supports **qBittorrent**, **Transmission**, and **Deluge** — save as many as you like (with optional custom names)
- Activate/deactivate downloaders and mark one as **preferred** (the default for plain clicks)
- **Categories** (qBittorrent): file torrents under a category, picked from the right-click menu or auto-assigned by **site rules** (e.g. `` → `audiobooks`)
- On-page toast confirms success or shows the error
- Popup with connection status and recently added torrents
- Settings page to manage your downloader list, with connection tests

## Tech Stack

- **WXT** — Web Extension framework
- **React 19** — UI
- **TypeScript** — Typing

## Configuration

1. Enable the web interface in your download client (e.g. qBittorrent: Tools → Options → Web UI)
2. Open the extension's settings (popup → Settings)
3. Click **+ Add Downloader**, pick your client, enter its web address (e.g. `http://192.168.1.100:8080`) and credentials
4. Click **Test Connection**, then **Save**
5. Repeat for any other clients; toggle them active/inactive and pick your preferred one

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Then load the unpacked extension in your browser:

- **Chrome:** `chrome://extensions` → Enable Developer mode → Load unpacked → select `.output/chrome-mv3`
- **Firefox:** `npm run dev:firefox` → `about:debugging` → Load Temporary Add-on → select `.output/firefox-mv2`

## Build

```bash
npm run build
```

Output is in `.output/`. Use the `chrome-mv3` or `firefox-mv2` folder to load the extension.

## Package for Distribution

```bash
npm run zip        # Chrome
npm run zip:firefox # Firefox
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev mode (Chrome) |
| `npm run dev:firefox` | Dev mode (Firefox) |
| `npm run build` | Production build |
| `npm run build:firefox` | Production build (Firefox) |
| `npm run zip` | Create distributable zip |
| `npm run compile` | Type-check only |
