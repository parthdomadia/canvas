# Canvas

A visual knowledge-mapping desktop app. Create text notes on an infinite canvas and connect them to build knowledge graphs.

Built with Electron + React + Konva + FastAPI + Supabase.

---

## What it does

- **Infinite canvas** — pan and zoom (Figma-style zoom-to-cursor)
- **Notes** — double-click to create, double-click to edit, drag to move, corner-drag to resize
- **Connections** — drag from a node's edge handle to connect; left-click = simple edge, right-click = directed edge (with arrowhead)
- **Graph highlighting** — select a node to see teal (directed reachability) and gold (simple neighbors) highlights
- **Cluster drag** — right-click drag any node to move its entire connected component
- **Delete** — select nodes or edges and press Backspace/Delete

---

## Tech stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron |
| Frontend | React 18 + TypeScript (Vite) |
| Canvas rendering | Konva.js |
| State | Zustand |
| Backend | Python + FastAPI |
| Database | PostgreSQL via Supabase |

---

## Getting started

### Prerequisites

- Node.js 18+
- Python 3.11+
- A Supabase project with the schema below

### Setup

```bash
# Install root + frontend dependencies
npm install
cd frontend && npm install && cd ..

# Install backend dependencies
cd backend && pip install -r requirements.txt && cd ..

# Configure environment
cp backend/.env.example backend/.env
# Fill in SUPABASE_URL and SUPABASE_KEY in backend/.env
```

### Database

Run these in your Supabase SQL editor:

```sql
CREATE TABLE canvases (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title      TEXT NOT NULL DEFAULT 'Untitled Canvas',
    viewport_x FLOAT NOT NULL DEFAULT 0,
    viewport_y FLOAT NOT NULL DEFAULT 0,
    viewport_z FLOAT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE nodes (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    content   TEXT NOT NULL DEFAULT '',
    x         FLOAT NOT NULL,
    y         FLOAT NOT NULL,
    width     FLOAT NOT NULL DEFAULT 200,
    height    FLOAT NOT NULL DEFAULT 120,
    color     TEXT NOT NULL DEFAULT 'default',
    z_index   INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE edges (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    label     TEXT,
    style     TEXT NOT NULL DEFAULT 'solid',
    edge_type TEXT NOT NULL DEFAULT 'simple',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT no_self_loop CHECK (source_id != target_id)
);
```

### Run in development

```bash
# Terminal 1 — backend
cd backend && uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend + Electron
npm run dev
```

### Run tests

```bash
cd frontend && npm test
```

---

## Project structure

```
canvas/
├── electron/          # Electron main process
├── frontend/
│   └── src/
│       ├── api/       # REST API calls
│       ├── components/
│       │   ├── canvas/   # CanvasStage, NodeLayer, EdgeLayer, NoteCard, EdgeLine
│       │   └── overlay/  # NodeEditor (text editing overlay)
│       ├── store/     # Zustand canvas store
│       ├── types/     # Shared TypeScript types
│       └── utils/     # Coordinate transforms
└── backend/
    └── app/
        ├── routers/   # nodes, edges, canvases
        └── schemas/   # Pydantic models
```

---

## Roadmap

- [x] Phase 1 — Project skeleton
- [x] Phase 2 — Node CRUD
- [x] Phase 3 — Edge connections
- [ ] Phase 4 — Undo/redo + selection
- [ ] Phase 5 — UI polish + themes
- [ ] Phase 6 — Electron packaging (.exe)
