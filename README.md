<p align="center">
  <img src="public/icons/icon128.png" alt="Tab Manager AI" width="80" height="80" />
  <h1 align="center">Tab Manager AI</h1>
  <p align="center">
    AI-powered Chrome extension that monitors your open tabs,<br/>
    auto-classifies them into smart groups, and helps you stay focused.
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/manifest-v3-blue?logo=googlechrome&logoColor=white" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/react-18-61dafb?logo=react&logoColor=white" alt="React 18" />
  <img src="https://img.shields.io/badge/typescript-5.7-3178c6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/vite-6-646cff?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/tailwindcss-3-06b6d4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
</p>

---

## Features

**Smart Tab Classification**
Automatically sorts your tabs into categories like Development, Research, Shopping, Social, News, and more — using local keyword matching or optional AI via Anthropic Claude.

**Tab Groups at a Glance**
View all your open tabs organized by category in both a compact popup and a full side panel. Color-coded groups make it easy to find what you need.

**Session Management**
Save your current tab layout as a named session. Restore it later to pick up exactly where you left off.

**Tab Limit Alerts**
Set a custom tab limit and get notified when you've gone over. The badge turns red so you know it's time to clean up.

**Export as Tasks**
Send any tab to Notion or Trello as a task card with one click.

**Keyboard Shortcuts**
| Shortcut | Action |
|---|---|
| `Ctrl+Shift+M` (Mac: `Cmd+Shift+M`) | Open popup |
| `Ctrl+Shift+S` (Mac: `Cmd+Shift+S`) | Open side panel |

---

## Architecture

```
tab-manager-ai/
├── src/
│   ├── background/
│   │   └── service-worker.ts    # Chrome event hub — tab monitoring, alarms, message routing
│   ├── ai/
│   │   └── classifier.ts        # Local keyword + optional Anthropic AI tab classification
│   ├── storage/
│   │   └── index.ts             # chrome.storage abstraction — settings, sessions, snippets
│   ├── content/
│   │   └── content.ts           # Content script — extracts page text for classification
│   ├── popup/
│   │   ├── popup.html           # Popup entry HTML
│   │   ├── main.tsx             # React mount
│   │   └── App.tsx              # Compact popup UI (360×480)
│   ├── sidepanel/
│   │   ├── sidepanel.html       # Side panel entry HTML
│   │   ├── main.tsx             # React mount
│   │   └── App.tsx              # Full side panel UI with tabs, sessions, settings
│   └── shared/
│       ├── types.ts             # All TypeScript types and constants
│       ├── messaging.ts         # Typed sendMessage helper
│       ├── ErrorBoundary.tsx    # React error boundary component
│       └── styles.css           # Tailwind imports + custom animations
├── public/
│   ├── manifest.json            # Chrome Extension Manifest V3
│   └── icons/                   # Extension icons (16, 32, 48, 128px)
├── scripts/
│   └── gen-icons.mjs            # Generates placeholder PNG icons
├── vite.config.ts               # Vite build config with Chrome extension output
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [npm](https://www.npmjs.com/) or [Bun](https://bun.sh/)
- Google Chrome 114+

### Install

```bash
git clone https://github.com/reda194/tab-manager-ai.git
cd tab-manager-ai
npm install
```

### Development

```bash
npm run dev
```

This runs `vite build --watch` — rebuilding on every file change.

### Production Build

```bash
npm run build
```

Output goes to `dist/`.

### Load in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `dist/` folder

The extension icon will appear in your toolbar. Click it to open the popup, or use `Ctrl+Shift+S` to open the side panel.

---

## Classification Categories

Tabs are classified into one of these groups:

| Category | Color | Example Sites |
|---|---|---|
| Development | Green | GitHub, Stack Overflow, npm, MDN |
| Research | Purple | Wikipedia, arXiv, Scholar, Coursera |
| Documentation | Gray | Notion, Confluence, ReadTheDocs |
| Shopping | Orange | Amazon, eBay, AliExpress, Noon |
| Social | Pink | Twitter/X, Reddit, LinkedIn, Discord |
| News | Yellow | BBC, CNN, Reuters, TechCrunch |
| Entertainment | Cyan | YouTube, Netflix, Spotify, Twitch |
| Communication | Red | Gmail, Outlook, Zoom, Google Meet |
| Work | Blue | Trello, Jira, Asana, Linear |
| Other | Gray | Anything that doesn't match the above |

### AI-Powered Classification (Optional)

For smarter grouping, enable AI classification in Settings:

1. Open the side panel → **Settings**
2. Toggle **Enable AI** on
3. Select **Anthropic Claude** as provider
4. Enter your [Anthropic API key](https://console.anthropic.com/)

The extension sends tab titles, URLs, and page snippets to Claude for classification. Without AI, classification runs entirely locally using keyword and domain matching.

---

## Integrations

### Notion

Export tabs as tasks in a Notion database:

1. Create a Notion integration at [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Get your API key and a database ID
3. Enter them in **Settings → Integrations**

### Trello

Export tabs as cards on a Trello board:

1. Get your API key at [trello.com/app-key](https://trello.com/app-key)
2. Generate a token and get your board ID
3. Enter them in **Settings → Integrations**

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 18 |
| Language | TypeScript 5.7 |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS 3 |
| Extension Platform | Chrome Manifest V3 |
| AI (optional) | Anthropic Claude API |

---

## How It Works

1. **Background service worker** listens for tab events (create, update, remove, activate) with per-event debouncing
2. On each change, it queries all open tabs and runs them through the **classifier**
3. The classifier checks tab URLs and titles against keyword/domain rules (or sends them to Claude if AI is enabled)
4. Tab groups are cached in `chrome.storage.local` and the badge updates with the current count
5. A **periodic alarm** re-classifies every 5 minutes
6. The **content script** extracts page headings and text snippets from each page you visit, storing them to improve classification accuracy
7. The **popup** and **side panel** read cached groups and communicate with the background via typed messages

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m "Add my feature"`)
4. Push to your branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## License

MIT
