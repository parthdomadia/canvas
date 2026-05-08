# Canvas App — Design Spec
**Date:** 2026-05-07  
**Status:** Approved

---

## Overview

A visual knowledge-mapping desktop application. Users create text notes (nodes) on an infinite canvas and connect them with edges to form knowledge graphs. Single-user MVP. Packaged as a standalone Windows desktop app via Electron.

---

## Confirmed Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Desktop shell | Electron | Standalone window, spawns Python backend as child process |
| Frontend | React 18 + TypeScript (Vite) | Largest ecosystem, best canvas/diagram library support |
| Canvas rendering | Konva.js | HTML5 Canvas 2D — performant, handles thousands of nodes, full control |
| State management | Zustand + zundo | Minimal boilerplate, efficient diff-based undo/redo |
| Server state | TanStack Query | Caching, optimistic updates, automatic rollback on error |
| Styling | Tailwind CSS + Radix UI | Utility-first, accessible primitives, theme-friendly |
| Backend | Python + FastAPI + Uvicorn | User's preferred language, async, fast, clean API |
| ORM | SQLAlchemy (async) + Alembic | Async Postgres support, migrations |
| Database | PostgreSQL via Supabase | Hosted, free tier, nice dashboard, production-realistic |
| API style | REST | Simple, sufficient, no GraphQL needed |

---

## System Architecture

Three layers:

**Browser (Electron renderer process)**
- React + Konva renders the infinite canvas
- Zustand + zundo owns all canvas state and undo/redo history
- TanStack Query handles server state (fetching, caching, invalidation)
- Tailwind + Radix UI for toolbar, panels, theme switcher

**Backend (Electron child process)**
- FastAPI with three routers: `/nodes`, `/edges`, `/canvases`
- SQLAlchemy async ORM with Alembic for migrations
- Pydantic models for request/response validation

**Database (Supabase-hosted Postgres)**
- Three tables in MVP: `canvases`, `nodes`, `edges`. A `snapshots` table is planned post-MVP for version history but not created now.

### Key Data Flow

**Canvas state flow (writes):**
User action → Zustand mutation (optimistic, instant UI) → zundo records diff → debounced API call (500ms) → Supabase persisted

**Load flow:**
App loads → TanStack Query fetches canvas → nodes + edges hydrate Zustand → Konva renders viewport → ready

**Error handling:**
If API mutation fails → TanStack Query rolls back optimistic update automatically

---

## Database Schema

```sql
CREATE TABLE canvases (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL DEFAULT 'Untitled Canvas',
    viewport_x  FLOAT NOT NULL DEFAULT 0,
    viewport_y  FLOAT NOT NULL DEFAULT 0,
    viewport_z  FLOAT NOT NULL DEFAULT 1,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE nodes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canvas_id   UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    content     TEXT NOT NULL DEFAULT '',
    x           FLOAT NOT NULL,
    y           FLOAT NOT NULL,
    width       FLOAT NOT NULL DEFAULT 200,
    height      FLOAT NOT NULL DEFAULT 120,
    color       TEXT NOT NULL DEFAULT 'default',
    z_index     INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE edges (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canvas_id   UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    source_id   UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    target_id   UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    label       TEXT,
    style       TEXT NOT NULL DEFAULT 'solid',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT no_self_loop CHECK (source_id != target_id)
);

CREATE INDEX idx_nodes_canvas_id ON nodes(canvas_id);
CREATE INDEX idx_edges_canvas_id ON edges(canvas_id);
CREATE INDEX idx_edges_source    ON edges(source_id);
CREATE INDEX idx_edges_target    ON edges(target_id);
```

**Schema decisions:**
- Coordinates are canvas-space (not screen-space) — viewport state is stored separately
- `color` stores a theme token string (`'default'`, `'red'`, etc.) not raw hex
- `ON DELETE CASCADE` — deleting a canvas or node cascades to dependent edges
- `snapshots` table deferred to post-MVP

---

## API Contract

**Base URL:** `http://localhost:8000/api/v1`

### Canvases
```
POST  /canvases        → create canvas (called once on first app launch if none exists)
GET   /canvases/{id}   → full canvas load (nodes + edges in one response)
PATCH /canvases/{id}   → update title or viewport position
```

**Initialization:** On first launch, Electron renderer calls `GET /canvases/default` (a special alias). If none exists, the backend auto-creates one and returns it. The canvas ID is then stored in localStorage for subsequent loads.

### Nodes
```
POST   /canvases/{id}/nodes         → create node
PATCH  /nodes/{id}                  → update content, position, size, color
DELETE /nodes/{id}                  → delete node (cascades edges)
PATCH  /canvases/{id}/nodes/batch   → bulk position update (multi-drag end)
```

### Edges
```
POST   /canvases/{id}/edges   → create edge
PATCH  /edges/{id}            → update label or style
DELETE /edges/{id}            → delete edge
```

### Example: Initial Load Response
```json
{
  "id": "abc-123",
  "title": "My Brain Map",
  "viewport": { "x": -240.5, "y": 120.0, "z": 0.85 },
  "nodes": [
    {
      "id": "node-1", "content": "System Design",
      "x": 400, "y": 300, "width": 200, "height": 120,
      "color": "default", "z_index": 0
    }
  ],
  "edges": [
    {
      "id": "edge-1", "source_id": "node-1", "target_id": "node-2",
      "label": null, "style": "solid"
    }
  ]
}
```

### Autosave Strategy
- Text edits: debounced 500ms → `PATCH /nodes/{id}`
- Position changes: fired once on drag-end → batch endpoint
- Viewport changes: debounced 1s → `PATCH /canvases/{id}`
- Create/delete: immediate, no debounce

---

## Frontend Component Architecture

```
App.tsx                          # Theme provider, TanStack Query client
└── CanvasPage.tsx               # Fetches data, hydrates Zustand, keyboard shortcuts
    ├── Toolbar.tsx              # Tool mode, undo/redo, theme switcher, title
    ├── CanvasStage.tsx          # Konva Stage — pan/zoom, pointer routing
    │   ├── EdgeLayer.tsx        # Konva Layer — all edges (below nodes)
    │   │   └── EdgeLine.tsx × N
    │   ├── NodeLayer.tsx        # Konva Layer — all nodes (above edges)
    │   │   ├── NoteCard.tsx × N
    │   │   ├── SelectionBox.tsx
    │   │   └── ConnectionHandle.tsx
    │   └── UIOverlay.tsx        # HTML div over canvas — text editing, menus
    │       ├── NodeEditor.tsx   # Textarea for in-place text editing
    │       └── ContextMenu.tsx
    ├── MiniMap.tsx              # HTML Canvas 2D — navigation overview
    └── ZoomControls.tsx         # +/−, fit-to-screen, zoom %
```

### Two-Layer Rendering (Key Design)
- **Konva layer:** all nodes and edges as Canvas 2D primitives — fast, no DOM diffing
- **HTML overlay:** positioned `<div>` over the canvas for text editing (real `<textarea>`), context menus, tooltips
- In sync via `canvasToScreen(x, y, viewport)` coordinate transform

---

## State Management

### Canvas Store (Zustand + zundo)
```ts
interface CanvasStore {
  nodes: Record<string, Node>
  edges: Record<string, Edge>
  canvasId: string
  viewport: { x: number; y: number; z: number }
  selectedIds: Set<string>
  toolMode: 'select' | 'connect' | 'pan'
  connectingFrom: string | null

  addNode, updateNode, deleteNode: ...
  addEdge, deleteEdge: ...
  setViewport, setSelected: ...
  undo, redo: ()  // provided by zundo
}
```

zundo tracks diffs on `nodes` and `edges` only. `viewport`, `selectedIds`, `toolMode`, `connectingFrom` are excluded from undo history.

### Server State (TanStack Query)
- Initial fetch: `useQuery(['canvas', id])` — loads everything in one request
- Mutations: optimistic update to Zustand first, rollback via `invalidateQueries` on error

### Theme Store (Zustand + persist)
```ts
interface ThemeStore {
  theme: 'dark-dense' | 'light-clean' | 'dark-accent'
  setTheme: (t: Theme) => void
}
```
Persisted to localStorage. Three themes fully implemented. User can switch at any time.

### UI State
Local `useState` in components — context menu open/closed, which node is being edited, hover states. No global store.

---

## Infinite Canvas Implementation

### Coordinate System
- **Canvas-space:** node positions are fixed (x, y in abstract units)
- **Screen-space:** pixel positions in the Electron window
- **Transform:**
  - Canvas → Screen: `screenX = canvasX * zoom + panX`
  - Screen → Canvas: `canvasX = (screenX - panX) / zoom`
- Konva Stage applies: `stage.position({x: panX, y: panY})` + `stage.scale({x: zoom, y: zoom})`

### Pan
- Middle mouse drag or Space + left drag
- Updates stage position directly (no React state update during pan)

### Zoom to Cursor (Figma-style)
```ts
const zoomTowardPoint = (stage, pointer, newZoom) => {
  const oldZoom = stage.scaleX()
  stage.scale({ x: newZoom, y: newZoom })
  const newPos = {
    x: pointer.x - (pointer.x - stage.x()) * (newZoom / oldZoom),
    y: pointer.y - (pointer.y - stage.y()) * (newZoom / oldZoom),
  }
  stage.position(newPos)
}
```

### Edge Rendering
- Konva `Arrow` shapes between node center points
- Per-node edge index (`sourceId → edge[]`, `targetId → edge[]`) — only recompute connected edges on drag, not all edges

### Text Editing Hybrid
- Double-click node → hide Konva text, show `<textarea>` at same screen position via HTML overlay
- On blur/Enter → hide textarea, Konva resumes

---

## Performance Strategy

| Concern | Strategy |
|---|---|
| Node/edge rendering | Konva Canvas 2D — no DOM, no React reconciler |
| Drag performance | Update Zustand on `dragmove`, debounce API to `dragend` only |
| Edge recompute | Per-node index — only recompute connected edges on drag |
| Konva redraws | Memoize nodes — only redraw when content or selected state changes |
| Viewport culling | At 500+ nodes, skip rendering nodes outside viewport + 10% margin |
| Spatial index | Grid bucketing (400×400px cells) for hit detection at scale |
| Pan/zoom | Entirely in Konva event handlers — no React state updates during gesture |

---

## Folder Structure

```
canvas/
├── electron/
│   ├── main.ts                  # Window creation, Python backend spawn
│   ├── preload.ts               # Context bridge (minimal)
│   └── python-runner.ts         # Spawn/kill FastAPI subprocess
├── frontend/
│   └── src/
│       ├── api/                 # client.ts, canvases.ts, nodes.ts, edges.ts
│       ├── components/
│       │   ├── canvas/          # CanvasStage, NodeLayer, EdgeLayer, NoteCard, EdgeLine, ...
│       │   ├── overlay/         # UIOverlay, NodeEditor, ContextMenu
│       │   └── ui/              # Toolbar, ZoomControls, MiniMap, ThemeSwitcher
│       ├── hooks/               # useCanvasInteraction, useKeyboardShortcuts, useAutosave
│       ├── store/               # canvasStore.ts, themeStore.ts
│       ├── utils/               # coordinates.ts, geometry.ts
│       └── types/               # index.ts
├── backend/
│   └── app/
│       ├── main.py
│       ├── database.py
│       ├── models/              # canvas.py, node.py, edge.py
│       ├── schemas/             # canvas.py, node.py, edge.py
│       └── routers/             # canvases.py, nodes.py, edges.py
└── package.json                 # Root — Electron + Vite scripts
```

---

## Development Roadmap

| Phase | Name | Key Deliverables | Complexity |
|---|---|---|---|
| 1 | Project Skeleton | Electron window, FastAPI child process, Supabase connected, blank Konva stage with pan/zoom | Low |
| 2 | Node CRUD | Create/edit/delete/move nodes, persisted to DB, canvas loads on app start | Medium |
| 3 | Edge Connections | Draw edges between nodes, edge CRUD, live preview on drag | Medium-High |
| 4 | Undo/Redo + Selection | Full Ctrl+Z stack via zundo, rubber-band selection, multi-select drag | Medium |
| 5 | UI Polish + Themes | All 3 themes, theme switcher, minimap, zoom controls, context menu, animations | Medium |
| 6 | Electron Packaging | PyInstaller backend binary, Electron Builder .exe, loading screen, app icon | Low-Medium |

**MVP complete after Phase 6.**

---

## MVP Scope

### In Scope
- Infinite canvas with pan + zoom (Figma-style zoom-to-cursor)
- Text note creation, editing, deletion, repositioning
- Edge connections between notes with live preview
- Full undo/redo stack (all actions)
- Rubber-band multi-select + multi-drag
- Autosave to Supabase Postgres
- 3 switchable themes (Dark Dense, Light Clean, Dark Accent)
- MiniMap navigation
- Zoom controls (fit-to-screen, +/−)
- Context menu (right-click)
- Standalone Windows .exe via Electron + PyInstaller

### Intentionally Deferred
- Multiple canvases / canvas list
- Node color picker beyond default
- Edge labels and style variants
- Search / global node search
- Auth / user accounts
- Real-time collaboration
- Media uploads (images, files)
- AI-assisted graphing
- Version history / snapshots
- Export (PNG, JSON, Markdown)

---

## Future Expansion Path

| Feature | What's already in place |
|---|---|
| Multi-user collaboration | Supabase Realtime can be added on top of existing schema; canvases table already separates workspaces |
| Auth | Supabase Auth drops in; canvas ownership via `user_id` FK |
| Version history | `snapshots` table already in schema design |
| Multiple canvases | `canvas_id` FK already on nodes/edges; just add a canvas list UI |
| AI features | FastAPI backend is trivially extended with new routers; Python has best AI library ecosystem |
| Media uploads | Supabase Storage is the natural extension; nodes table has `color` field that can be extended to `node_type` |

---

## Package List

### Frontend
```
react, react-dom
typescript
vite
konva, react-konva
zustand
zundo
@tanstack/react-query
tailwindcss
@radix-ui/react-* (dialog, context-menu, dropdown-menu, tooltip)
axios
```

### Electron
```
electron
electron-builder
```

### Backend (requirements.txt)
```
fastapi
uvicorn[standard]
sqlalchemy[asyncio]
asyncpg
alembic
pydantic
pydantic-settings
python-dotenv
```

### Dev Tools
```
eslint, prettier
pyinstaller (packaging)
```
