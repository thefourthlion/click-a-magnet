# Privacy Policy — Click a Magnet

**Last updated:** June 2026

Click a Magnet is a browser extension that sends magnet links to torrent download clients you configure (e.g. qBittorrent, Transmission). This policy describes what data the extension handles.

## Summary

- All settings are stored **locally on your device**.
- The extension **does not** send data to the developer or sell data to third parties.
- Network requests go **only** to download client URLs **you** enter in settings.

## Data stored locally

The extension uses `chrome.storage.local` to save:

- Download client type, display name, and Web UI URL
- Usernames and passwords you provide for those clients
- Your preferred/default downloader selection
- Category names and domain-to-category rules you create
- A short list of recently added torrent names (shown in the popup)

This data stays in your browser profile until you remove the extension or clear extension data.

## Data sent over the network

When you click a magnet link (or use the right-click menu), the extension may send:

- The **magnet link URL** to your configured download client
- **Authentication credentials** you saved, to log in to that client’s Web API

Requests are made only to hosts you configured. The extension does not contact developer-operated servers.

## Data read from web pages

The extension runs on web pages only to detect when you click a link whose address starts with `magnet:`. It reads:

- The magnet link URL you clicked
- The page URL (hostname only) to apply optional domain-to-category rules

It does **not** read general page text, images, form fields, keystrokes, or browsing history.

## Permissions

| Permission | Why |
|------------|-----|
| **storage** | Save your downloader settings locally |
| **contextMenus** | Right-click menu to pick downloader and category |
| **Host access (`http://*/*`, `https://*/*`)** | Reach your client’s URL (often a LAN IP or private seedbox) |
| **Content script (`<all_urls>`)** | Intercept magnet link clicks on pages you visit |

## Remote code

All extension code is bundled in the published package. The extension does not download or execute JavaScript or WebAssembly from remote servers.

## Children

This extension is not directed at children under 13.

## Changes

This policy may be updated when the extension changes. The version in the [GitHub repository](https://github.com/thefourthlion/click-a-magnet) is authoritative.

## Contact

Open an issue on [GitHub](https://github.com/thefourthlion/click-a-magnet/issues) for privacy questions.
