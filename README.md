# Notion Clipper

Chrome extension for one-click saving webpages to Notion.

## Features

- 🔗 **One-click save** - Extract page metadata and save to Notion in seconds
- 🏷️ **Smart tagging** - Add tags, priority, and notes when saving
- 📊 **Reading time** - Auto-calculated based on content length
- 🔄 **Offline queue** - Save even without internet, sync when online
- 📚 **Database selection** - Choose which Notion database to save to
- 🎯 **Duplicate detection** - Know if you've already saved a page

## Installation

### From Source

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `build/chrome-mv3-dev` folder

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Package for distribution
npm run package
```

## Setup

1. Create a Notion integration at https://www.notion.so/my-integrations
2. Copy your integration token
3. Open the extension popup and connect to Notion
4. Share your databases with the integration

## Architecture

```
src/
├── background/     # Service worker for background tasks
├── content/        # Content script for page extraction
├── popup/          # Popup UI (React)
├── types/          # TypeScript type definitions
└── utils/          # Utility functions
    ├── content.ts      # Page metadata extraction
    ├── notion-api.ts   # Notion API client
    └── storage.ts      # Chrome storage wrapper
```

## Tech Stack

- **Plasmo** - Chrome extension framework
- **React** - UI framework
- **TypeScript** - Type safety
- **Notion API** - Data storage

## License

MIT © 2025
