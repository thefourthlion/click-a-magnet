# Click a Magnet

A browser extension built with [WXT](https://wxt.dev), React, and TypeScript.

## Tech Stack

- **WXT** — Web Extension framework
- **React 19** — UI
- **TypeScript** — Typing

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
