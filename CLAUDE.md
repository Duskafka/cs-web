# CLAUDE.md - CS Knowledge 3D Brain Mindmap Project Guide

## 1. Project Overview
This project is an interactive, 3D brain-shaped CS Knowledge Graph website built with **Next.js** and **Three.js / react-force-graph-3d**. It automatically parses local Markdown files (`.md`), derives connections by scanning each note's body for the names other notes declare, and visualizes the knowledge network in 3D space with a brain-shaped structural topology.

### Key Goals
- **Automatic Knowledge Parsing**: Load local Markdown files; a keyword scan turns them into Graph Nodes and Edges. Markdown holds content only — links are never written by hand.
- **Brain Spatial Clustering**: Position nodes based on CS domains (OS, Network, DB, etc.) mapped to specific 3D brain lobe regions.
- **Dual-View UI/UX**: Provide a smooth dual-pane UI (3D interactive canvas + Markdown document reader with search/filter).
- **Vercel Optimization**: Static generation (SSG) / ISR for fast loading and low web worker overhead.

---

## 2. Tech Stack

- **Framework**: Next.js 14+ (App Router, TypeScript)
- **Styling**: Tailwind CSS, Shadcn UI, Lucide Icons
- **Visualization**: `react-force-graph-3d`, `three`, `@react-three/fiber` (optional fallback: `react-force-graph-2d` for mobile)
- **State Management**: Zustand (for graph state, active node, selection history)
- **Markdown Engine**: `gray-matter`, `remark`, `rehype`, `remark-wiki-link`
- **Deployment**: Vercel (SSG / Build-time Static Parsing)

---

## 3. Project Structure

```text
├── content/              # Local CS Markdown notes
│   ├── os/               # e.g., process.md, thread.md
│   ├── network/          # e.g., tcp-ip.md, http.md
│   ├── database/         # e.g., transaction.md, index.md
│   └── ds-algo/          # e.g., binary-tree.md
├── src/
│   ├── app/              # Next.js App Router pages & APIs
│   │   ├── layout.tsx
│   │   ├── page.tsx      # Main Dual-View page
│   │   └── api/graph/    # Optional endpoint for graph data payload
│   ├── components/
│   │   ├── 3d/           # Three.js / ForceGraph components
│   │   │   ├── BrainGraphCanvas.tsx
│   │   │   ├── NodeTooltip.tsx
│   │   │   └── BrainLobeBoundaries.tsx
│   │   ├── ui/           # Sidebar, Search, Detail Reader components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── NoteReader.tsx
│   │   │   └── StatsHeader.tsx
│   │   └── markdown/     # Custom Markdown renderer components
│   ├── lib/
│   │   ├── markdown.ts   # Local MD parser (frontmatter, HTML, plain text)
│   │   ├── keywordScan.ts  # Keyword matching rules
│   │   ├── links.ts      # content/links.json reader + overrides
│   │   ├── brainLobeMap.ts # CS category to 3D spatial coordinate mapping
│   │   └── graphUtils.ts # Node/Edge graph generator
│   └── types/            # TypeScript interfaces (Node, Link, Note, etc.)
└── CLAUDE.md
```

---

## 4. Architecture & Technical Specifications

### A. Local Markdown & Keyword Scan Pipeline
1. **Directory Scanning**: At build time (or static data fetch), scan `/content/**/*.md`.
2. **Frontmatter & Content Extraction**:
    - Extract `title`, `category`, `tags`, `summary`, `created_at`, `aliases`.
    - Render the body to HTML and to a plain-text index. Code blocks are excluded from the plain text, so a name that only appears in a code sample never becomes an edge.
3. **Keyword Scan** (`npm run scan:links`): each note's `title` + `aliases` become its keywords. Every note's plain text is searched for every other note's keywords. Matching rules differ by script — see `src/lib/keywordScan.ts`:
    - **Hangul** keywords match as substrings, because Korean particles attach directly (`프로세스가`, `프로세스를`).
    - **ASCII** keywords require word boundaries, or `DP` matches inside `UDP`. Space / hyphen / underscore spellings are interchangeable.
4. **Storage**: the scan writes `content/links.json`, the single source of truth for edges. `links` is generated; `exclude` and `extra` are hand-written and preserved across runs.
5. **Graph Data Model**:
    - **Nodes ($V$)**: `{ id: string, title: string, category: string, slug: string, val: number (connection count) }`
    - **Links ($E$)**: `{ source: string, target: string, relationship: "keyword" }`

### B. Brain Lobe Spatial Clustering Algorithm
Standard 3D force-directed graphs form random spherical shapes. To enforce a **Brain Contour**:
1. **Lobe Coordinates Mapping**:
    - **Frontal Lobe (Logic/Algorithms)**: Positive $Z$, upper $Y$ coordinates.
    - **Temporal Lobe (Memory/Database)**: Side lower $X$, $Y$ coordinates.
    - **Occipital Lobe (Backend/Server-side)**: Negative $Z$, upper $Y$ coordinates.
    - **Parietal Lobe (Systems/Architecture)**: Top-center $Y$, neutral $Z$.
    - **Brainstem/Cerebellum (OS/Low-level/Hardware)**: Lower $Y$, negative $Z$ base coordinates.
2. **Custom Force Assignment**:
    - Apply a custom 3D force towards category-defined target centroids ($x_c, y_c, z_c$) using standard ellipsoid boundary constraints.

### C. Dual-View UX Architecture
- **Desktop Layout**:
    - **Left / Center**: 3D Brain Canvas with node highlight on hover/click.
    - **Right Sidebar (Collapsible)**: Search bar, CS note count badge, selected note details with rendered Markdown.
- **Mobile Layout**:
    - Automatically switch to 2D graph mode or single-column drawer view to conserve WebGL performance.

### D. Performance & WebGL Optimization
- **LOD (Level of Detail)**: Scale down particle counts and disable heavy post-processing effects when nodes exceed 100+.
- **Dynamic Imports**: Load `react-force-graph-3d` with `ssr: false` in Next.js to prevent window object hydration errors.
- **Canvas Throttling**: Pause rendering loop when node interaction ceases.

---

## 5. Development Workflow & Commands

### Setup & Running
```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Build for production (pre-renders static graph JSON)
npm run build

# Rescan connections after editing content/ (rewrites content/links.json)
npm run scan:links

# Verify the keyword matching rules and the parsed graph
npm run test:scan
npm run check:graph
```

### Conventions & Rules
1. **Strict Type Safety**: Every graph node, link, and frontmatter must adhere to TypeScript interfaces defined in `@/types/graph.ts`.
2. **Component Separation**: Keep Three.js rendering logic (`BrainGraphCanvas.tsx`) strictly separated from UI state drawers (`NoteReader.tsx`).
3. **Links Are Never Hand-Written**: Markdown files contain content only — no link syntax. After editing `content/`, run `npm run scan:links` and review the added/removed edges it prints; `npm run scan:links -- --check` fails when `content/links.json` is stale. A false positive is best fixed at its source by dropping the ambiguous alias from frontmatter; use `exclude` in `content/links.json` only when the keyword itself is worth keeping. Since the body carries no links, the reader navigates through the two connection lists at the bottom of a note.
4. **Authentic Design & Styling**: Day mode is the default theme (near-white `#f4f8f4` base with a deep green accent); dark mode is a toggle. Colors live only as semantic tokens in `globals.css` — never hardcode a palette class in a component. Each CS domain keeps its own color, with a light and a dark variant in `brainLobeMap.ts`.