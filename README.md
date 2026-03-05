# Elastic Search AI Platform - Interactive Presentation

An interactive web presentation showcasing the Elastic Search AI Platform, built with React, Tailwind CSS, and Framer Motion. Features Elastic brand-aligned styling with dark/light themes.

## Features

- **18+ Interactive Scenes** - Comprehensive, animated storytelling experience including Product Roadmap
- **Scene Settings Panel** - Customize which scenes to include, reorder via drag-and-drop, and set time allocations
- **Team Editor** - Add, edit, and manage team members directly in the browser with photo upload support
- **Keyboard Navigation** - Use arrow keys, space, or number keys to navigate
- **Smooth Transitions** - Spring-based page transitions with Framer Motion
- **Dark/Light Theme** - Toggle between visual modes (button in bottom-left corner)
- **Elastic Brand Styling** - Colors, typography, and design aligned with Elastic brand guidelines
- **Persistent Settings** - Scene and team configuration saved to localStorage
- **Product Roadmap** - Timeline view of Elastic roadmap items from GitHub Projects, with filters and LLM summarization
- **Vercel Web Analytics** - Privacy-friendly analytics integration ready to use (see [Analytics Guide](docs/VERCEL_ANALYTICS.md))

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Product Roadmap (Optional)

To populate the Product Roadmap scene with live data from Elastic's GitHub Projects:

```bash
# Copy env template and add your GitHub token
cp .env.example .env
# Edit .env: set GITHUB_TOKEN=ghp_xxx (create at https://github.com/settings/tokens with read:org, read:project)

# Fetch roadmap data
npm run fetch:roadmap
```

See [Product Roadmap](#product-roadmap) for full setup and optional LLM summarization.

## Navigation

| Input | Action |
|-------|--------|
| `→` / `Space` / `Enter` | Next scene |
| `←` / `Backspace` | Previous scene |
| `1-9`, `0` | Jump to scene 1-10 |
| `Escape` | Exit input fields |
| Nav Menu | Click scene names in top bar |
| Chevron Buttons | Click arrows on sides |

> **Note**: Number keys are disabled when typing in input fields. On the Product Roadmap scene, when the timeline overflows, `←` and `→` scroll the timeline instead of changing scenes.

## Settings Panel

Click the **gear icon** (⚙️) in the bottom-right corner to access settings with two tabs:

### Scenes Tab
- **Toggle Scenes**: Show/hide scenes from presentation
- **Reorder**: Drag scenes to change order
- **Set Duration**: Click time badge to edit
- **Total Time**: Shows presentation length
- **Reset**: Return to defaults

### Team Tab
- **Edit Members**: Click a member card to expand and edit details
- **Upload Photos**: Click "Upload" to add a photo from your device
- **Add/Remove**: Add new members or delete existing ones
- **Export/Import**: Download team config as JSON or import from file
- **Reset**: Restore from default `team.json` file

## Team Configuration

Team data is stored in the browser's **localStorage** and persists across sessions.

### Storage Behavior

| Scenario | Behavior |
|----------|----------|
| Same browser | ✅ Changes persist |
| Different browser | ❌ Each browser has its own data |
| Incognito mode | ❌ Data cleared when window closes |
| Different device | ❌ No sync between devices |

### Photo Options

1. **Upload** - Click "Upload" button, select image (auto-resized to 200px, compressed)
2. **URL** - Paste a path like `/photos/name.jpg` or external URL
3. **Initials** - If no photo, displays colored initials as fallback

### Default Configuration

Place a `team.json` file in `public/config/` to set defaults:

```json
{
  "title": "Meet Your Elastic Team",
  "subtitle": "Before we dive in—here's who you'll be working with today",
  "members": [
    {
      "id": "unique-id",
      "name": "Full Name",
      "role": "Job Title",
      "email": "email@elastic.co",
      "phone": "123.456.7890",
      "color": "#0B64DD",
      "initials": "FN",
      "photo": "/photos/name.jpg"
    }
  ]
}
```

This file loads as the default when no localStorage data exists.

## Scenes

| Scene | Description | Duration |
|-------|-------------|----------|
| Introduction | Hero scene with platform tagline | - |
| Agenda | Overview of presentation topics | - |
| Team Introductions | Contact cards for your Elastic team | 2 min |
| About Elastic | Company overview and capabilities | 5 min |
| Desired Outcomes | Business value and success metrics | 10 min |
| Problem Patterns | Common challenges we solve | 10 min |
| The Data Challenge | 175ZB data explosion visualization | 3 min |
| Unified Strategy | Data flow and consolidation strategy | 5 min |
| The Platform | Elastic platform pillars and solutions | 5 min |
| Cross-Cluster Search | Distributed search at global scale | 3 min |
| Data Mesh | Distributed data architecture | 5 min |
| Elastic Common Schema | Schema-on-write advantages | 5 min |
| Access Control | Live RBAC & ABAC security demo | 3 min |
| ES\|QL | Piped query language demo | 3 min |
| Data Tiering | ILM and searchable snapshots | 3 min |
| Licensing | Simplified licensing model | 3 min |
| Product Roadmap | Timeline of Elastic roadmap items from GitHub Projects | 5 min |
| Consolidation | Tool sprawl reduction | 3 min |
| Services & Support | Zero-downtime migration demo | 5 min |
| Next Steps | Action items and contact info | 2 min |

## Deployment

After building, the `dist` folder contains static files ready for deployment:

```bash
# Build the app
npm run build

# Preview locally (http://localhost:4173)
npm run preview
```

**Deploy to any static hosting:**
- **Netlify/Vercel**: Connect repo for automatic deployments
- **GitHub Pages**: Copy `dist` contents to gh-pages branch
- **AWS S3/CloudFront**: Upload `dist` to S3 bucket
- **Any web server**: Serve `dist` folder as static files

## Tech Stack

- [React 18](https://react.dev/) - UI framework
- [Vite](https://vitejs.dev/) - Build tool
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Framer Motion](https://www.framer.com/motion/) - Animations
- [FontAwesome](https://fontawesome.com/) - Icons
- [Vercel Analytics](https://vercel.com/analytics) - Privacy-friendly web analytics

## Customization

### Colors & Typography
Edit `tailwind.config.js` for Elastic brand colors:
```js
colors: {
  elastic: {
    blue: '#0B64DD',      // Primary blue
    teal: '#48EFCF',      // Accent teal
    pink: '#F04E98',      // Accent pink
    'dev-blue': '#101C3F', // Dark background
    // ... more colors
  }
}
```

### Theme Variables
Edit `src/index.css` for CSS variables:
```css
:root {
  --elastic-blue: #0B64DD;
  --elastic-teal: #48EFCF;
  /* ... */
}
```

### Content
- **Scenes**: Edit components in `src/scenes/`
- **Scene Order**: Modify `scenes` array in `src/App.jsx`
- **Team Defaults**: Edit `public/config/team.json`
- **Roadmap Summaries**: Edit `public/config/summarize-prompt.txt` for custom LLM prompts (e.g. PUBSEC/DOD focus)

## Product Roadmap

The Product Roadmap scene displays items from Elastic's GitHub Projects roadmap. Configure which items appear and how they're summarized.

### Fetching Roadmap Data

1. **Create a GitHub token** at https://github.com/settings/tokens with scopes `read:org` and `read:project`.

2. **Configure environment** – Copy `.env.example` to `.env` and set:
   ```
   GITHUB_TOKEN=ghp_your_token_here
   ```

3. **Run the fetch script**:
   ```bash
   npm run fetch:roadmap
   ```
   This writes `public/config/roadmap.json` with items from the Elastic Public Roadmap project.

### Optional: LLM Summarization

To add AI-generated summaries (For/Value/Scope) to each item:

1. **Enable summarization** in `.env`:
   ```
   FETCH_ROADMAP_SUMMARIZE=true
   ```

2. **Configure AWS Bedrock** – Set `BEDROCK_MODEL_ID`, `AWS_REGION`, and AWS credentials (or use `~/.aws/credentials`).

3. **Custom prompt** (optional) – Set `SUMMARIZE_PROMPT_FILE=public/config/summarize-prompt.txt` to use a custom prompt. The default `summarize-prompt.txt` is tuned for US public sector, DOD, and defense audiences.

4. **Re-run fetch** – `npm run fetch:roadmap` will add summaries to existing items.

### Configuring the Timeline

1. Open the Product Roadmap scene.
2. Click the **gear icon** (top-right of the roadmap) to open the config modal.
3. **Filters** – Narrow items by Product Area, Status, State (primary), and Release Type, Key Initiatives, Labels (More filters).
4. **Select items** – Check items to include in the timeline; selections persist in localStorage.
5. **Select All / Unselect All** – Bulk actions for the filtered list.
6. Close the modal – the timeline updates with your selections.

### Timeline Navigation

- **Arrow buttons** – Click left/right to scroll between timeline bands.
- **Keyboard** – When the timeline has overflow, `←` and `→` scroll the timeline (not the presentation).
- **Scroll** – Swipe or scroll horizontally when content overflows.
- **Centering** – When the timeline fits the viewport, it centers automatically.

### Field Mapping (Advanced)

If the GitHub project schema changes, run discovery and update the mapping:

```bash
FETCH_ROADMAP_DISCOVER=true npm run fetch:roadmap
```

This dumps the project schema to `public/config/roadmap-schema.json`. Update `scripts/roadmap-field-mapping.json` to map field names (e.g. `productArea`, `releaseType`, `status`) to the actual GitHub field names.

---

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── Navigation.jsx    # Top navigation bar
│   ├── ProgressBar.jsx   # Progress indicator
│   ├── RoadmapConfigModal.jsx  # Roadmap item selection & filters
│   ├── RoadmapDetailModal.jsx  # Item detail view
│   └── SceneSettings.jsx # Settings panel with scene & team editors
├── context/              # React context providers
│   ├── RoadmapContext.jsx  # Roadmap selection & filter state
│   ├── ThemeContext.jsx  # Dark/light theme state
│   └── TeamContext.jsx   # Team configuration state
├── hooks/                # Custom React hooks
│   └── useThemeStyles.js # Theme-aware styling utilities
├── scenes/               # Individual presentation scenes
│   ├── HeroScene.jsx
│   ├── TeamScene.jsx
│   ├── RoadmapScene.jsx  # Product roadmap timeline
│   ├── AccessControlSceneDev.jsx
│   └── ...
├── App.jsx               # Main app with scene configuration
└── index.css             # Global styles & CSS variables

scripts/
├── fetch-roadmap.js      # Fetches roadmap from GitHub Projects
└── roadmap-field-mapping.json  # Maps GitHub fields to app schema

public/
├── config/
│   ├── team.json         # Default team configuration
│   ├── roadmap.json      # Roadmap data (from npm run fetch:roadmap)
│   ├── roadmap-schema.json  # Project schema (from discovery mode)
│   └── summarize-prompt.txt  # Custom LLM prompt for summaries
├── photos/               # Team member photos
└── *.svg, *.png          # Logo and brand assets
```

## localStorage Keys

| Key | Purpose |
|-----|---------|
| `presentation-scene-config` | Scene visibility, order, and durations |
| `presentation-team-config` | Team member data (including uploaded photos as base64) |
| `presentation-roadmap-config` | Roadmap selected item IDs and filter state |
| `theme` | Dark/light mode preference |

## 📊 Analytics

This project includes **Vercel Web Analytics** for privacy-friendly visitor tracking. The integration is already set up and will automatically start collecting data once you:

1. Deploy to Vercel
2. Enable Analytics in your Vercel project settings

For detailed information about the analytics integration, configuration options, and how to view your data, see the [Vercel Analytics Guide](docs/VERCEL_ANALYTICS.md).

---

Built with ❤️ for Elastic
