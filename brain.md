# Brain

> This is the architectural source of truth for the click-a-magnet browser extension.
> The AI must consult this file before writing any code.
> If reality drifts from this document, update the document — don't ignore it.

---

## What This Extension Does

**Click a Magnet** sends magnet links to the user's torrent download client with one click.

1. The **content script** (all pages) intercepts clicks on `a[href^="magnet:"]` links, prevents navigation, and messages the background. It also renders toasts requested by the background.
2. The **background** service worker resolves the target downloader (explicit pick > preferred > first enabled), resolves a category (explicit menu pick > site rule for the page's domain), and adds the torrent via the matching client (qBittorrent, Transmission, Deluge, ruTorrent, BiglyBT, Tribler, KTorrent, aria2, µTorrent, BitTorrent, Flood, or Synology Download Station). It also owns the right-click context menu: downloader picker when several are active, category submenu per category-capable downloader.
3. The **options page** manages a *list* of downloaders (add/edit/remove, active toggle, custom label, "preferred" radio), plus **categories** and **site rules** (domain → category auto-assignment).
4. The **popup** shows the preferred client's connection status, the active-client count, and the last 5 added torrents (with which client each went to).

---

## Stack

| Layer | Technology | Version / Notes |
|-------|-----------|-----------------|
| **Framework** | WXT | 0.20.x — Next-gen Web Extension framework |
| **Build** | Vite (via WXT) | Rolldown bundler |
| **Language** | TypeScript | Strict mode. All new files must be `.ts` / `.tsx`. |
| **UI** | React | 19.x |
| **React Integration** | @wxt-dev/module-react | WXT module for React entrypoints |
| **Manifest** | Auto-generated | MV3 by default. No source `manifest.json` — WXT generates from entrypoints + config. |
| **Package Manager** | npm | `package.json` scripts, `package-lock.json` |

---

## Directory Structure

```
click-a-magnet/
├── assets/                      # Static assets (imported in code)
│   ├── theme.css                # Shared CSS variables (light/dark) for popup + options
│   └── react.svg                # Leftover from starter (unused)
├── entrypoints/                 # WXT entrypoints — each file/dir = one extension piece
│   ├── popup/                   # Popup UI (browser action)
│   │   ├── index.html           # Entrypoint — popup HTML shell
│   │   ├── main.tsx             # React mount point
│   │   ├── App.tsx              # Status + recent torrents + settings button
│   │   ├── App.css              # Component styles
│   │   └── style.css            # Popup sizing
│   ├── options/                 # Settings page (opens in a tab)
│   │   ├── index.html           # Entrypoint
│   │   ├── main.tsx             # React mount point
│   │   ├── App.tsx              # Connection form: URL, username, password, test
│   │   └── style.css            # Settings card styles
│   ├── background.ts            # Service worker — handles ADD_MAGNET / TEST_CONNECTION messages
│   └── content.ts               # Content script (<all_urls>) — magnet click interception + toast
├── utils/                       # Shared logic (imported via @/utils/...)
│   ├── downloaders/             # Download client implementations
│   │   ├── types.ts             # DownloaderClient interface, DownloaderConfig, DownloaderEntry, baseUrl()
│   │   ├── qbittorrent.ts       # qBittorrent Web API v2 (cookie auth)
│   │   ├── transmission.ts      # Transmission RPC (basic auth + X-Transmission-Session-Id)
│   │   ├── deluge.ts            # Deluge Web JSON-RPC (password-only auth)
│   │   ├── rutorrent.ts         # ruTorrent addtorrent.php + rTorrent XML-RPC (/RPC2)
│   │   ├── biglybt.ts           # BiglyBT XM Web UI — Transmission-compatible RPC
│   │   ├── tribler.ts           # Tribler REST API (/api/downloads, X-Api-Key)
│   │   ├── ktorrent.ts          # KTorrent Web Interface plugin (challenge login)
│   │   ├── aria2.ts             # aria2 JSON-RPC (/jsonrpc, token auth)
│   │   ├── utorrent.ts          # µTorrent + BitTorrent Web UI (/gui, token auth)
│   │   ├── bittorrent.ts        # re-exports BitTorrent client (same API as µTorrent)
│   │   ├── flood.ts             # Flood REST API (/api/torrents/add-urls, jwt cookie)
│   │   ├── synology.ts          # Synology Download Station Web API (DSM sid auth)
│   │   └── index.ts             # Registry: downloaders map, getClient(type), displayName(entry)
│   ├── magnet.ts                # parseMagnetName()
│   ├── storage.ts               # downloadersStorage, preferredStorage, recentStorage, categoriesStorage, domainRulesStorage, resolveTarget(), categoryForUrl(), migrateLegacyConfig()
│   └── messages.ts              # Message / MessageResponse / ToastKind types
├── public/                      # Static assets copied to output root
│   ├── icon/                    # Extension icons (auto-discovered)
│   │   ├── 16.png
│   │   ├── 32.png
│   │   ├── 48.png
│   │   ├── 96.png
│   │   └── 128.png
│   └── wxt.svg
├── .wxt/                        # Generated by WXT (do not edit)
│   ├── tsconfig.json
│   ├── wxt.d.ts
│   └── types/                   # Path aliases, globals, imports
├── wxt.config.ts                # WXT config (manifest overrides, modules)
├── tsconfig.json                # Extends .wxt/tsconfig.json
├── package.json
├── constitution.md
├── soul.md
└── brain.md
```

**Output:** `.output/` (gitignored) — built extension. `manifest.json` is generated at `.output/{target}/manifest.json`.

---

## Entrypoints

| Entrypoint | File(s) | Purpose |
|------------|---------|---------|
| **Popup** | `entrypoints/popup/` | Preferred-client status, active count, recent torrents, "Settings". React app. |
| **Options** | `entrypoints/options/` | Downloader list management (add/edit/remove, active toggle, preferred). Opens in a tab (`manifest.open_in_tab`). React app. |
| **Background** | `entrypoints/background.ts` | Service worker. Handles `ADD_MAGNET` / `TEST_CONNECTION` messages, target resolution, context menus, talks to downloader APIs. |
| **Content Script** | `entrypoints/content.ts` | Injected into `<all_urls>`. Intercepts magnet link clicks, shows toasts. |

### Entrypoint Rules

- **Single file:** `entrypoints/{name}.{ext}` (e.g. `background.ts`)
- **Directory:** `entrypoints/{name}/index.{ext}` + related files (e.g. `popup/index.html`, `popup/main.tsx`)
- **Do not** put related files directly in `entrypoints/` — WXT treats each file there as a separate entrypoint.
- Entrypoints must be zero or one level deep. No `entrypoints/foo/bar/index.ts`.

### Manifest Options in Entrypoints

- **Content scripts:** `defineContentScript({ matches, main })` — options inline.
- **Background:** `defineBackground(() => { ... })` — no separate manifest file.
- **HTML (popup):** `<meta name="manifest.type" content="browser_action" />` — popup uses `browser_action` by default.

---

## Architecture Rules

### Popup (React)

- `index.html` is the entrypoint. It loads `main.tsx`, which mounts React to `#root`.
- Use `ReactDOM.createRoot` (React 18+). `main.tsx` already does this.
- Import assets via `@/assets/` or `/` for public files (e.g. `/wxt.svg`).
- Popup is a normal React SPA — useState, useEffect, etc. work as usual.

### Background

- Runs as a service worker (MV3). No DOM, no `window`.
- Use `defineBackground(() => { ... })`. Runtime code must be inside the callback — WXT imports the file in Node during build.
- Use `browser` (or `chrome`) API for extension APIs. `browser.runtime.id`, `browser.storage`, etc.
- For messaging: `browser.runtime.sendMessage`, `browser.runtime.onMessage`.

### Content Script

- Injected into matching pages. Has DOM access but runs in isolated world by default.
- Use `defineContentScript({ matches: [...], main(ctx) { ... } })`. Runtime code must be in `main`.
- `matches` in this project: `['<all_urls>']` — magnet links can appear anywhere.
- Click handling uses the **capture phase** (`addEventListener('click', fn, true)`) to beat page handlers, then `preventDefault()` + `stopImmediatePropagation()`.
- Toasts are plain DOM elements appended to `documentElement` with inline styles and max z-index — no framework in the content script.
- To inject into main world: use `world: 'MAIN'` or `injectScript` for unlisted scripts.

### Downloaders (utils/downloaders/)

- All API requests go through the **background**, never from content scripts or pages.
- Every client implements `DownloaderClient`: `name`, `needsUsername`, `urlHint`, `addMagnet()`, `testConnection()`. Adding a new downloader = one new file + one registry entry in `index.ts`. The options UI picks up new clients automatically.
- Users can save **multiple entries** (even of the same type — the optional `label` distinguishes them, `displayName()` resolves what to show).
- Errors must be thrown with **user-readable messages** — they're shown verbatim in toasts and the settings page.
- Host permissions `http://*/*` + `https://*/*` are what let the service worker reach LAN IPs.

**qBittorrent** (Web API v2): POST `/api/v2/auth/login` (form-urlencoded) sets an SID cookie; subsequent `credentials: 'include'` requests send it. v4.x returns 200 + "Ok."/"Fails." body; v5.x returns 204 empty on success, 401 on bad credentials — handle both. Add: POST `/api/v2/torrents/add` (FormData `urls`). Test: GET `/api/v2/app/version`.

**Transmission** (RPC at `/transmission/rpc`): basic auth header. CSRF: first request returns 409 + `X-Transmission-Session-Id` header; retry with it. Add: method `torrent-add` with `{ filename: magnet, labels: [category] }` when a category is set. Test: `session-get` → `version`.

**Deluge** (JSON-RPC at `/json`): `auth.login` with password only (no username; sets `_session_id` cookie). Extension auto-connects via `web.get_hosts` + `web.connect` when `web.connected` is false. Add: `core.add_torrent_magnet`, then Label plugin (`label.add` + `label.set_torrent`) when a category is set. Test: `daemon.get_version` with fallback to "connected".

**ruTorrent** (rTorrent Web UI): GET `/php/initplugins.php` to link PHP to rTorrent, then POST `/php/addtorrent.php` with `{ url: magnet, label?, json: 1 }`. Test: XML-RPC `system.client_version` at `/RPC2`. Optional HTTP basic auth. Subdirectory installs supported via the configured base URL.

**BiglyBT** (XM Web UI plugin): Transmission-compatible JSON-RPC at `/transmission/rpc` (falls back to `/rpc`). Add: `torrent-add` with `{ filename: magnet, vuze_tags?: [category] }`. Test: `session-get` → `biglybt-version` or `version`. HTTP basic auth when configured in the Web UI.

**Tribler** (REST API): `PUT /api/downloads` with `{ uri: magnet }`. Auth: `X-Api-Key` header (password field in settings). Test: `GET /api/downloads` + `/docs/swagger.json` for version. No categories on add.

**KTorrent** (Web Interface plugin): `GET /login/challenge.xml`, then `POST /login?page=interface.html` with SHA1(challenge + password) in the `challenge` field (empty `password`). Add: `GET /action?load_torrent=…`. Test: `GET /data/torrents.xml?L10n=no`. Cookie session (`KT_SESSID`). Requires username + password. No categories on add. No Docker stack — manual testing only.

**aria2** (JSON-RPC): POST `/jsonrpc` with `{ jsonrpc: "2.0", method: "aria2.addUri", params: ["token:<secret>", [magnet]] }`. Test: `aria2.getVersion`. RPC secret only (password field in settings). URL may be the RPC base (`http://host:6800`); `/jsonrpc` is appended automatically. No categories on add.

**µTorrent / BitTorrent** (Web UI): GET `/gui/token.html` for CSRF token, then GET `/gui/?token=…&action=add-url&s=…`. HTTP basic auth when configured. Labels via `action=setprops&s=label` after add. Test: `list=1` → `build`. Both desktop clients share the same API; pick the matching type in settings.

**Flood** (REST API): POST `/api/auth/authenticate` (sets `jwt` cookie), then POST `/api/torrents/add-urls` with `{ urls: [magnet], tags?, start: true }`. Test: GET `/api/client/connection-test`. Tags used for categories. Works with rTorrent and other backends configured in Flood.

**Synology Download Station** (Synology Web API): `SYNO.API.Auth` login with `session=DownloadStation` and `format=sid`, then `SYNO.DownloadStation2.Task` (DSM 7+) or `SYNO.DownloadStation.Task` (legacy) to add magnets. Test: `SYNO.DownloadStation.Info` `getinfo`. Categories map to **destination** shared-folder paths. No Docker stack — test on a real NAS.

### Context Menu

- Rebuilt from scratch (`removeAll()` + `create()`) on service worker start and whenever `downloadersStorage`, `preferredStorage`, or `categoriesStorage` changes — idempotent.
- **Leaf ids encode their action as JSON:** `cam-send:{"d":"<entryId>","c":"<category>"}` — both fields optional (`d` absent = resolve preferred; `c` absent = auto category from site rules). Parsed in the click handler; survives service worker restarts because the action lives in the id itself.
- **Shape:** 0 active → one item that toasts an error. 1 active → "Add to {name}". 2+ → "Add to downloader" parent with one node per downloader. Any category-capable downloader node with categories defined becomes a parent: "Auto / no category" + one child per category.
- All items use `contexts: ['link']` + `targetUrlPatterns: ['magnet:*']`, with a fallback to unfiltered links if the pattern is rejected (handler validates the `magnet:` prefix).
- Result feedback goes to the page via a `SHOW_TOAST` tab message rendered by the content script. Fails silently on pages without the content script.

### Categories & Site Rules

- `categoriesStorage` = `string[]` of user-created names (lowercased on save). `domainRulesStorage` = `{ domain, category }[]`.
- **Resolution order** in `addMagnet`: explicit category from menu pick > `categoryForUrl(sourceUrl)` (matches hostname exactly or as suffix, e.g. `` matches `www.`) > none. The source URL comes from `sender.tab.url` (content script click) or `tab.url` (context menu).
- Clients with `supportsCategories: true` receive categories: **qBittorrent** (`createCategory` + `torrents/add`), **Transmission** (labels on `torrent-add`), **Deluge** (Label plugin + `label.set_torrent` after add), **ruTorrent** (`label` on `addtorrent.php`), **BiglyBT** (`vuze_tags` on `torrent-add`), **µTorrent** / **BitTorrent** (`setprops` label after add), **Flood** (`tags` on `add-urls`), **Synology Download Station** (`destination` folder path on task create).
- Deleting a category cascades: its site rules are removed too.
- Success toast shows the category: "Added to qBittorrent (audiobooks)".

### Messaging

- Types live in `utils/messages.ts` (`Message`, `MessageResponse`).
- Background listener uses the `sendResponse` + `return true` pattern (WXT's `browser` is native Chrome API, not a promise polyfill).
- Every response is `{ ok: true, data? }` or `{ ok: false, error }` — content/popup/options never throw on API failures, they render the error.

### Storage

- Use WXT's `storage.defineItem` (see `utils/storage.ts`). Keys: `local:downloaders`, `local:preferredDownloader`, `local:recentTorrents`, `local:categories`, `local:domainRules`.
- `downloaders` = `DownloaderEntry[]`, each `{ id (uuid), type, label?, url, username, password, enabled }`. Passwords live in plain `storage.local` — standard for this class of extension, but never log or sync them.
- `preferredDownloader` = entry id or null. **Target resolution** (`resolveTarget()`): explicit id > preferred-if-enabled > first enabled > null.
- `migrateLegacyConfig()` (run on background start) converts the old single-config keys (`local:downloaderConfig`, `local:qbConfig`) into a one-entry list and marks it preferred.
- Recent torrents list is capped at 10 entries in storage (popup shows 5); each records the downloader's display name in `client`.

### Path Aliases

- `@/` → project root (e.g. `@/assets/react.svg`)
- `~/`, `@@/`, `~~/` → also project root
- Public assets: `/icon/48.png`, `/wxt.svg` (paths relative to extension root)

### Styling & Design Language

- **Pastel hacker terminal**: dark terminal slate (`#1e1e2e`, Catppuccin-adjacent) with soft pastel accents — mint (primary action), pink (active states), lavender (labels/info), peach (warnings), pastel red (errors). Single dark theme; `color-scheme: dark`.
- **Monospace everywhere** (`--font-mono`, system mono stack — no remote fonts). Lowercase terminal-style headings and buttons.
- Motifs: `~/` and `~$` prompt prefixes, `❯` list markers, `#`/`//` comment-style hints, blinking `.cursor` block (defined in theme.css), dashed hairline rules, soft pastel glow on hover/active (box-shadow).
- Voice: plain, direct UI copy. **Error messages from downloader clients stay verbatim.** Controls stay obvious despite the theme.
- Plain CSS. `assets/theme.css` holds the design tokens, imported by both popup and options `main.tsx`. `style.css` = entrypoint-level; `App.css` = component-scoped.
- Content script toasts mirror the palette with inline styles (dark bg, pastel border/text, `❯` prefix) — keep `TOAST_ACCENTS` in sync with theme.css if the palette changes.
- No Tailwind or CSS-in-JS. Add only if needed; discuss first.

---

## Coding Style

| Convention | Rule |
|-----------|------|
| **File extension** | `.tsx` for components with JSX, `.ts` for logic-only. All new files must be TypeScript. |
| **Component naming** | PascalCase file and export (`App.tsx`, `export default function App`). |
| **Function / variable naming** | camelCase. |
| **Exports** | Default export for entrypoint components (`App.tsx`). Named exports for utilities. |
| **Imports** | Use `@/` for project paths. Group: (1) external packages, (2) internal modules, (3) styles. |
| **Guard clauses** | Prefer early returns over nested `if/else`. |
| **Async** | `async/await` over `.then()`. |
| **Console** | Remove `console.log` before committing or use only for dev debugging. |

---

## Environment Variables

This project has no `.env` or environment variables by default. If you add any:

- Use `import.meta.env` (Vite) for build-time values.
- Never commit secrets. Use `.env.example` as a template.
- Add `.env` to `.gitignore` if storing local overrides.

---

## Build & Deploy

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server. Load `.output/chrome-mv3` (or similar) in browser. |
| `npm run dev:firefox` | Dev build for Firefox. |
| `npm run build` | Production build. Output in `.output/`. |
| `npm run build:firefox` | Production build for Firefox. |
| `npm run zip` | Create distributable zip for Chrome. |
| `npm run zip:firefox` | Create distributable zip for Firefox. |
| `npm run compile` | Type-check only (`tsc --noEmit`). |
| `npm run postinstall` | Runs `wxt prepare` (generates types, etc.). |

**Loading the extension:**
1. Run `npm run dev` or `npm run build`
2. Open `chrome://extensions` (or Firefox `about:debugging`)
3. Enable Developer mode
4. Load unpacked → select `.output/chrome-mv3` (or `.output/firefox-mv2` for Firefox)

---

## Known Patterns to Preserve

1. **HTML entrypoint structure:** `index.html` → `main.tsx` → `App.tsx`. Keep this flow for popup and options.
2. **WXT defines:** Use `defineBackground`, `defineContentScript` — don't hand-roll manifest entries.
3. **Icons:** `public/icon/` with sizes 16, 32, 48, 96, 128. WXT auto-discovers `icon/*.png`.
4. **No source manifest.json** — all manifest config comes from `wxt.config.ts` and entrypoint options.
5. **Downloader API calls only in background** — content scripts and UI pages send messages; they never fetch the APIs directly.
6. **Dev browser:** `wxt.config.ts` points the chrome binary at Brave (`webExt.binaries.chrome`). Machine-specific; don't remove without checking with the Human.

---

## Known Issues & Tech Debt

- Credentials live in plain `storage.local` (standard for this extension type, but worth knowing).
- No support for `.torrent` file links yet — magnet URIs only.
- Magnet links opened via JS (`window.location = 'magnet:...'`) are not intercepted — only real `<a>` clicks.
- qBittorrent verified against v5.2.1; Transmission, Deluge, ruTorrent, BiglyBT, Tribler, and aria2 verified against local Docker stacks (`scripts/test-downloaders.mts`).
- `assets/react.svg` is leftover from the starter and unused.

---

## WXT Module: @wxt-dev/module-react

The project uses `@wxt-dev/module-react` in `wxt.config.ts`. This module:

- Enables React in HTML entrypoints (popup, options, etc.)
- Provides React hooks as globals in content scripts (`useState`, `useEffect`, etc.) when using content script UI
- Auto-configures JSX/React for WXT

Do not remove without replacing React setup manually.
