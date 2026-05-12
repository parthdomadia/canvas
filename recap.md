# Session Recap

## Bug Fixes

### Edge creation not working
- **Root cause**: `handleLayerMouseUp` cleared `connectingFromId` before the target node's `onClick` could use it (event ordering)
- **Fix**: Moved edge creation logic entirely into `handleLayerMouseUp` using a canvas-space bounding-box hit test to find the target node

### Data loss on refresh
- **Root cause**: `EdgeResponse` schema had a required `edge_type` field before the DB column existed → backend returned 500 → frontend's catch block treated any error as 404 and created a new empty canvas
- **Fix**: Added `edge_type: str = "simple"` default to `EdgeResponse`; frontend now only clears localStorage canvas ID on 404, re-throws all other errors
- **Required migration**: `ALTER TABLE edges ADD COLUMN edge_type TEXT NOT NULL DEFAULT 'simple';`

### Right-click triggering node selection
- **Fix**: Added `if (e.evt.button !== 0) return` guard in `handleClick`

---

## Features Added

### Two edge types
- **Left-click drag** from connection handle → simple edge (plain line)
- **Right-click drag** from connection handle → directed edge (line + arrowhead at midpoint)
- `edge_type` field added to backend schema, Supabase table, and frontend types/API

### Connected node highlighting (on node select)
- **Teal** (`#14B8A6`): nodes reachable via directed edges — transitive BFS, source→target only
- **Egg yolk** (`#F5C518`): direct neighbors via simple edges (one hop, both directions)
- Teal takes priority if a node qualifies for both
- Matching edge colors: directed path edges → teal, simple neighbor edges → egg yolk
- Connected node glow reduced 40% vs primary selected node (`shadowBlur` 7 vs 16)

### Cluster drag
- **Right-click + drag** any node → moves entire connected component (BFS through all edges, both directions, both types)
- Relative positions preserved; whole subgraph translates as one unit

---

## Performance Optimizations

### Eliminated per-pixel store writes during drag
- Individual node drag: removed `onDragMove` → `updateNode` (was firing 60×/sec); Konva handles visual drag natively, store only updated on `dragEnd`
- Per-component subscriptions: `NoteCard` subscribes to `s.nodes[nodeId]` (its own node only); `EdgeLine` subscribes to its own source/target nodes — dragging node A only re-renders NoteCard(A) and connected EdgeLines

### Fixed selector memoization
- Changed `useCanvasStore((s) => Object.values(s.edges))` → stable `edgesById` record + `useMemo(() => Object.values(edgesById), [edgesById])` in NodeLayer and EdgeLayer
- `useCallback` on all NodeLayer handlers to keep NoteCard `memo` intact

### Cluster drag: fully bypasses React
- **During drag**: `window.mousemove` (not Layer events — Layer only fires over shapes) → imperative `group.position()` on Konva nodes via `nodeGroupRefs` Map; edge points updated via `edgeUpdateFns` Map → `stage.batchDraw()`. Zero React renders, zero Zustand writes
- **On release**: one `moveNodes` batch action syncs all positions to store; React/edges reconcile in one pass
- `moveNodes` store action added to update N nodes in a single `set()` call

---

## Files Changed

| File | Change |
|------|--------|
| `backend/app/schemas/edge.py` | Added `edge_type` field with defaults |
| `backend/app/routers/edges.py` | Pass `edge_type` in Supabase insert |
| `frontend/src/types/index.ts` | Added `edge_type` to `CanvasEdge` |
| `frontend/src/api/edges.ts` | Added `edgeType` param to `createEdge` |
| `frontend/src/api/canvases.ts` | Only clear canvas ID on 404, not all errors |
| `frontend/src/store/canvasStore.ts` | Added `moveNodes` batch action |
| `frontend/src/components/canvas/ConnectionHandle.tsx` | Detect right-click (button=2), pass `edgeType` |
| `frontend/src/components/canvas/NoteCard.tsx` | Per-node store subscription; `nodeGroupRefs` registry; cluster drag + right-click handlers; highlight props |
| `frontend/src/components/canvas/NodeLayer.tsx` | Full rewrite: `useCallback` handlers, BFS highlighting, cluster drag with window events + imperative Konva |
| `frontend/src/components/canvas/EdgeLine.tsx` | Per-edge node subscriptions; `edgeUpdateFns` registry; directed/simple rendering; highlight colors |
| `frontend/src/components/canvas/EdgeLayer.tsx` | Stable selectors; BFS highlight color map |

---

## Phase 4: Undo/Redo + Selection (completed previous session)

- Undo/redo via `zundo` temporal middleware — tracks `nodes` and `edges` only (theme excluded)
- Rubber-band selection: Space + drag draws a selection rect, selects all nodes within bounds
- Multi-select: Ctrl+Click toggles individual nodes; Delete/Backspace deletes all selected nodes and their edges
- Edge selection: click an edge to select it; Delete removes it
- Keyboard shortcuts modal: pill button top-left, grouped shortcuts with `<kbd>` keycaps, Escape closes, focus managed via `closeButtonRef`
- Shared `.app-scrollable` CSS class for consistent scrollbar styling across NodeEditor and ShortcutsModal

---

## Phase 6: Electron Packaging (Railway + electron-builder)

### Backend deployed to Railway

- FastAPI backend deployed to Railway using a root-level `Dockerfile` (Python 3.11-slim)
- `ALLOW_ALL_ORIGINS=true` env var makes CORS permissive in production; local dev stays strict
- `allow_all_origins: bool = False` added to `pydantic_settings` Settings class
- Railway URL: `https://canvas-production-0f81.up.railway.app` — `/health` returns `{"status":"ok"}`
- Railway networking configured to port 8080 (auto-detected); Dockerfile CMD uses `${PORT:-8000}` via `sh -c`

### Frontend env files

- `frontend/.env.development` — `VITE_API_BASE_URL=http://localhost:8000`
- `frontend/.env.production` — `VITE_API_BASE_URL=https://canvas-production-0f81.up.railway.app`
- Railway URL baked into Vite production bundle at build time

### Electron packaging

- Removed `extraResources` from `package.json` build config (was referencing non-existent `backend/dist/`)
- Added `mac` DMG target alongside existing `win` NSIS target
- `npm run build && npx electron-builder` (run as Administrator for symlink permissions) produces `release/Canvas Setup 1.0.0.exe`
- App installed and verified: nodes create and save through Railway → Supabase

### TypeScript fixes required for build

- Added `"types": ["vite/client"]` to `frontend/tsconfig.json` to resolve `import.meta.env` type error
- Renamed unused `oldBox` → `_oldBox` in `NodeLayer.tsx` boundBoxFunc
- Added missing `edge_type: 'simple'` to edge fixture in `canvasStore.test.ts`

### Files added/changed

| File | Change |
|---|---|
| `Dockerfile` | New — root-level Docker build for Railway |
| `backend/app/config.py` | Added `allow_all_origins: bool = False` |
| `backend/app/main.py` | CORS origins conditional on `allow_all_origins` |
| `backend/tests/test_cors.py` | New — 4 CORS tests |
| `backend/railway.toml` | New — nixpacks build config (unused when Dockerfile present) |
| `frontend/.env.development` | New |
| `frontend/.env.production` | New |
| `frontend/tsconfig.json` | Added `"types": ["vite/client"]` |
| `package.json` | Removed `extraResources`, added `mac` target |

---

## Phase 5: UI Polish

### Dot grid background

- New `DotGrid.tsx` — single Konva `Rect` (±100,000 canvas units) with a tiled offscreen-canvas dot pattern
- 32px spacing, 1.5px dot radius, color from `theme.dotGrid`
- Added as first `<Layer listening={false}>` in `CanvasStage.tsx` — pans and zooms naturally with Stage
- `makeDotPattern(color)` builds a 32×32 offscreen canvas; `useMemo` rebuilds only on theme change
- `dotGrid` color added to all three themes: dark `#2a2a3a`, light `#c0c4cc`, matrix `#0d2e0d`

### Node animations

- **Creation**: on NoteCard mount, Konva tween scales + fades in (opacity 0→1, scale 0.85→1, 150ms EaseOut). Initial values set imperatively before tween to prevent flash.
- **Deletion**: two-phase — `startDeleteNodes(ids)` marks nodes in `pendingDeleteIds` (store); each NoteCard watches `isPendingDelete`, plays shrink+fade tween (opacity 1→0, scale 1→0.85, 120ms EaseIn), then calls `confirmDelete([nodeId])` on finish. Both tweens have cleanup returns.
- **Selection pulse**: on `isSelected` going true, two chained tweens: scale 1→1.04 (90ms EaseIn) then 1.04→1 (90ms EaseOut). `prevSelectedRef` ensures pulse only fires on the false→true transition. Both tween refs tracked for cleanup.

### Store changes for animated deletion

- `pendingDeleteIds: Set<string>` — not tracked in undo history (excluded from `partialize`)
- `startDeleteNodes(ids)` — adds IDs to `pendingDeleteIds`, does not remove from `nodes`
- `confirmDelete(ids)` — removes nodes + connected edges from state, clears from `pendingDeleteIds`; this write IS recorded in undo history
- `useKeyboardShortcuts` now calls `startDeleteNodes(nodeIds)` instead of `deleteNode` per node; API deletes fire immediately (before animation)

### Empty state

- `EmptyState.tsx` — centered fixed overlay with pulsing accent dot (`pulse-dot` CSS keyframe, 1.5s infinite alternate) and hint text "Double-click anywhere to create a note"
- `pointerEvents: none` — never blocks canvas interactions
- Shown in `UIOverlay` when `canvasId && Object.keys(nodes).length === 0` (gated on `canvasId` to prevent flash during async hydration)

### Files added/changed

| File | Change |
|---|---|
| `frontend/src/styles/themes.ts` | Added `dotGrid` to Theme interface + all 3 themes |
| `frontend/src/store/canvasStore.ts` | Added `pendingDeleteIds`, `startDeleteNodes`, `confirmDelete` |
| `frontend/src/store/__tests__/canvasStore.test.ts` | 4 new tests, updated `beforeEach` |
| `frontend/src/hooks/useKeyboardShortcuts.ts` | Use `startDeleteNodes` for node deletion |
| `frontend/src/components/canvas/DotGrid.tsx` | New |
| `frontend/src/components/canvas/CanvasStage.tsx` | Added DotGrid background layer |
| `frontend/src/components/canvas/NoteCard.tsx` | Mount, delete, and selection animations |
| `frontend/src/styles/globals.css` | Added `@keyframes pulse-dot` |
| `frontend/src/components/overlay/EmptyState.tsx` | New |
| `frontend/src/components/overlay/__tests__/EmptyState.test.tsx` | New — 2 render tests |
| `frontend/src/components/overlay/UIOverlay.tsx` | Added EmptyState with hydration guard |
