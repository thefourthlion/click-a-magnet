import { resolve } from 'node:path';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Click a Magnet',
    description: 'Send magnet links straight to your download client with one click.',
    permissions: ['storage', 'contextMenus'],
    // Needed to reach the user-configured qBittorrent server (often a LAN IP).
    host_permissions: ['http://*/*', 'https://*/*'],
  },
  webExt: {
    binaries: {
      chrome: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    },
    // Persist the dev profile so extension settings survive restarts.
    chromiumProfile: resolve('.wxt/chrome-data'),
    keepProfileChanges: true,
    // Open a page with magnet links so there's something to test against.
    startUrls: ['https://webtorrent.io/free-torrents'],
  },
});
