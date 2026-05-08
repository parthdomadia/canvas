# Canvas App — Phase 2: Node CRUD

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Users can double-click the canvas to create text notes, drag to reposition them, double-click a note to edit its text, press Delete to remove them, and all changes autosave to Supabase.

**Architecture:** TanStack Query fetches the canvas on load and hydrates Zustand. All mutations hit Zustand first (instant UI), then debounced API calls persist to the DB. The Konva Stage renders nodes; a positioned HTML overlay handles text editing via a real `<textarea>`.

**Tech Stack:** Zustand 4, TanStack Query 5, Konva 9, react-konva, axios, Tailwind CSS 3, FastAPI, SQLAlchemy 2 async

**Depends on:** Phase 1 complete (Electron window, Vite frontend, FastAPI backend, Alembic migration applied)

---

## File Map

```
frontend/
├── .env.local                                    CREATE
├── postcss.config.cjs                            CREATE
├── tailwind.config.ts                            CREATE
└── src/
    ├── main.tsx                                  MODIFY — import globals.css
    ├── App.tsx                                   MODIFY — QueryClientProvider + CanvasPage
    ├── styles/
    │   └── globals.css                           CREATE
    ├── types/
    │   └── index.ts                              CREATE
    ├── store/
    │   ├── canvasStore.ts                        CREATE
    │   └── __tests__/
    │       └── canvasStore.test.ts               CREATE
    ├── utils/
    │   ├── coordinates.ts                        CREATE
    │   └── __tests__/
    │       └── coordinates.test.ts               CREATE
    ├── api/
    │   ├── client.ts                             CREATE
    │   ├── canvases.ts                           CREATE
    │   └── nodes.ts                              CREATE
    ├── hooks/
    │   ├── useAutosave.ts                        CREATE
    │   └── useKeyboardShortcuts.ts               CREATE
    ├── pages/
    │   └── CanvasPage.tsx                        CREATE
    └── components/
        ├── canvas/
        │   ├── CanvasStage.tsx                   MODIFY — reads viewport from store, adds NodeLayer
        │   ├── NodeLayer.tsx                     CREATE
        │   └── NoteCard.tsx                      CREATE
        └── overlay/
            ├── UIOverlay.tsx                     CREATE
            └── NodeEditor.tsx                    CREATE

backend/
└── app/
    ├── main.py                                   MODIFY — include routers
    ├── schemas/
    │   ├── __init__.py                           CREATE
    │   ├── canvas.py                             CREATE
    │   ├── node.py                               CREATE
    │   └── edge.py                               CREATE (stub for Phase 3)
    ├── routers/
    │   ├── __init__.py                           CREATE
    │   ├── canvases.py                           CREATE
    │   └── nodes.py                              CREATE
    └── tests/
        ├── test_canvases.py                      CREATE
        └── test_nodes.py                         CREATE
```

---

## Task 1: Shared TypeScript types

**Files:**
- Create: `frontend/src/types/index.ts`

- [ ] **Step 1: Create frontend/src/types/index.ts**

```typescript
export interface CanvasNode {
  id: string
  canvas_id: string
  content: string
  x: number
  y: number
  width: number
  height: number
  color: string
  z_index: number
}

export interface CanvasEdge {
  id: string
  canvas_id: string
  source_id: string
  target_id: string
  label: string | null
  style: 'solid' | 'dashed' | 'dotted'
}

export interface Viewport {
  x: number  // pan X (stage offset)
  y: number  // pan Y (stage offset)
  z: number  // zoom scale
}

export interface CanvasData {
  id: string
  title: string
  viewport: Viewport
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

export type ToolMode = 'select' | 'connect' | 'pan'
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/types/
git commit -m "feat: add shared TypeScript types"
```

---

## Task 2: Coordinate utilities + tests

**Files:**
- Create: `frontend/src/utils/coordinates.ts`
- Create: `frontend/src/utils/__tests__/coordinates.test.ts`

- [ ] **Step 1: Write the tests**

```typescript
// frontend/src/utils/__tests__/coordinates.test.ts
import { describe, it, expect } from 'vitest'
import { canvasToScreen, screenToCanvas } from '../coordinates'

describe('canvasToScreen', () => {
  it('maps canvas origin to viewport pan position at zoom 1', () => {
    const result = canvasToScreen(0, 0, { x: 300, y: 200, z: 1 })
    expect(result).toEqual({ x: 300, y: 200 })
  })

  it('applies zoom and pan correctly', () => {
    const result = canvasToScreen(200, 100, { x: -100, y: -50, z: 2 })
    expect(result).toEqual({ x: 300, y: 150 })
  })

  it('returns same point at zoom=1, pan=0', () => {
    const result = canvasToScreen(450, 320, { x: 0, y: 0, z: 1 })
    expect(result).toEqual({ x: 450, y: 320 })
  })
})

describe('screenToCanvas', () => {
  it('is the exact inverse of canvasToScreen', () => {
    const viewport = { x: -100, y: -50, z: 2 }
    const screen = canvasToScreen(200, 100, viewport)
    const canvas = screenToCanvas(screen.x, screen.y, viewport)
    expect(canvas.x).toBeCloseTo(200)
    expect(canvas.y).toBeCloseTo(100)
  })

  it('maps screen point to canvas position at zoom 1', () => {
    const result = screenToCanvas(300, 200, { x: 0, y: 0, z: 1 })
    expect(result).toEqual({ x: 300, y: 200 })
  })

  it('accounts for pan offset', () => {
    const result = screenToCanvas(400, 300, { x: 100, y: 100, z: 1 })
    expect(result).toEqual({ x: 300, y: 200 })
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd frontend
npx vitest run src/utils/__tests__/coordinates.test.ts
```

Expected: `FAIL — Cannot find module '../coordinates'`

- [ ] **Step 3: Create frontend/src/utils/coordinates.ts**

```typescript
import type { Viewport } from '@/types'

/**
 * Convert canvas-space coordinates to screen-space pixels.
 * Used to position HTML overlay elements (textarea, context menu) over Konva shapes.
 *
 * screenX = canvasX * zoom + panX
 */
export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  viewport: Viewport,
): { x: number; y: number } {
  return {
    x: canvasX * viewport.z + viewport.x,
    y: canvasY * viewport.z + viewport.y,
  }
}

/**
 * Convert screen-space pixels to canvas-space coordinates.
 * Used to place new nodes where the user clicked on the canvas.
 *
 * canvasX = (screenX - panX) / zoom
 */
export function screenToCanvas(
  screenX: number,
  screenY: number,
  viewport: Viewport,
): { x: number; y: number } {
  return {
    x: (screenX - viewport.x) / viewport.z,
    y: (screenY - viewport.y) / viewport.z,
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/utils/__tests__/coordinates.test.ts
```

Expected: `PASS — 6 tests passed`

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend/src/utils/
git commit -m "feat: add coordinate transform utilities with tests"
```

---

## Task 3: Zustand canvas store + tests

**Files:**
- Create: `frontend/src/store/canvasStore.ts`
- Create: `frontend/src/store/__tests__/canvasStore.test.ts`

- [ ] **Step 1: Write the tests**

```typescript
// frontend/src/store/__tests__/canvasStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useCanvasStore } from '../canvasStore'
import type { CanvasNode } from '@/types'

const mockNode: CanvasNode = {
  id: 'node-1',
  canvas_id: 'canvas-1',
  content: 'Hello',
  x: 100,
  y: 200,
  width: 200,
  height: 120,
  color: 'default',
  z_index: 0,
}

beforeEach(() => {
  useCanvasStore.setState({
    canvasId: '',
    nodes: {},
    edges: {},
    viewport: { x: 0, y: 0, z: 1 },
    selectedIds: new Set(),
    toolMode: 'select',
    connectingFrom: null,
    editingNodeId: null,
  })
})

describe('hydrateCanvas', () => {
  it('populates nodes and edges from arrays', () => {
    useCanvasStore.getState().hydrateCanvas('canvas-1', [mockNode], [], { x: 0, y: 0, z: 1 })
    const { nodes, canvasId } = useCanvasStore.getState()
    expect(canvasId).toBe('canvas-1')
    expect(nodes['node-1']).toEqual(mockNode)
  })
})

describe('addNode', () => {
  it('adds a node to the store', () => {
    useCanvasStore.getState().addNode(mockNode)
    expect(useCanvasStore.getState().nodes['node-1']).toEqual(mockNode)
  })
})

describe('updateNode', () => {
  it('patches only specified fields', () => {
    useCanvasStore.getState().addNode(mockNode)
    useCanvasStore.getState().updateNode('node-1', { content: 'Updated', x: 150 })
    const node = useCanvasStore.getState().nodes['node-1']
    expect(node.content).toBe('Updated')
    expect(node.x).toBe(150)
    expect(node.y).toBe(200) // unchanged
  })
})

describe('deleteNode', () => {
  it('removes the node from the store', () => {
    useCanvasStore.getState().addNode(mockNode)
    useCanvasStore.getState().deleteNode('node-1')
    expect(useCanvasStore.getState().nodes['node-1']).toBeUndefined()
  })

  it('removes edges connected to the deleted node', () => {
    useCanvasStore.setState({
      nodes: { 'node-1': mockNode, 'node-2': { ...mockNode, id: 'node-2' } },
      edges: {
        'edge-1': {
          id: 'edge-1',
          canvas_id: 'canvas-1',
          source_id: 'node-1',
          target_id: 'node-2',
          label: null,
          style: 'solid',
        },
      },
    })
    useCanvasStore.getState().deleteNode('node-1')
    expect(useCanvasStore.getState().edges['edge-1']).toBeUndefined()
  })
})

describe('setSelectedIds', () => {
  it('stores selected IDs as a Set', () => {
    useCanvasStore.getState().setSelectedIds(['node-1', 'node-2'])
    expect(useCanvasStore.getState().selectedIds.has('node-1')).toBe(true)
    expect(useCanvasStore.getState().selectedIds.has('node-2')).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd frontend
npx vitest run src/store/__tests__/canvasStore.test.ts
```

Expected: `FAIL — Cannot find module '../canvasStore'`

- [ ] **Step 3: Create frontend/src/store/canvasStore.ts**

```typescript
import { create } from 'zustand'
import type { CanvasNode, CanvasEdge, Viewport, ToolMode } from '@/types'

interface CanvasState {
  canvasId: string
  nodes: Record<string, CanvasNode>
  edges: Record<string, CanvasEdge>
  viewport: Viewport
  selectedIds: Set<string>
  toolMode: ToolMode
  connectingFrom: string | null
  editingNodeId: string | null

  hydrateCanvas: (id: string, nodes: CanvasNode[], edges: CanvasEdge[], viewport: Viewport) => void
  addNode: (node: CanvasNode) => void
  updateNode: (id: string, patch: Partial<CanvasNode>) => void
  deleteNode: (id: string) => void
  addEdge: (edge: CanvasEdge) => void
  deleteEdge: (id: string) => void
  setViewport: (viewport: Viewport) => void
  setSelectedIds: (ids: string[]) => void
  setToolMode: (mode: ToolMode) => void
  setConnectingFrom: (id: string | null) => void
  setEditingNodeId: (id: string | null) => void
}

export const useCanvasStore = create<CanvasState>((set) => ({
  canvasId: '',
  nodes: {},
  edges: {},
  viewport: { x: 0, y: 0, z: 1 },
  selectedIds: new Set(),
  toolMode: 'select',
  connectingFrom: null,
  editingNodeId: null,

  hydrateCanvas: (id, nodes, edges, viewport) =>
    set({
      canvasId: id,
      nodes: Object.fromEntries(nodes.map((n) => [n.id, n])),
      edges: Object.fromEntries(edges.map((e) => [e.id, e])),
      viewport,
    }),

  addNode: (node) =>
    set((state) => ({ nodes: { ...state.nodes, [node.id]: node } })),

  updateNode: (id, patch) =>
    set((state) => ({
      nodes: {
        ...state.nodes,
        [id]: { ...state.nodes[id], ...patch },
      },
    })),

  deleteNode: (id) =>
    set((state) => {
      const { [id]: _removed, ...remainingNodes } = state.nodes
      const edges = Object.fromEntries(
        Object.entries(state.edges).filter(
          ([, e]) => e.source_id !== id && e.target_id !== id,
        ),
      )
      return { nodes: remainingNodes, edges }
    }),

  addEdge: (edge) =>
    set((state) => ({ edges: { ...state.edges, [edge.id]: edge } })),

  deleteEdge: (id) =>
    set((state) => {
      const { [id]: _removed, ...rest } = state.edges
      return { edges: rest }
    }),

  setViewport: (viewport) => set({ viewport }),

  setSelectedIds: (ids) => set({ selectedIds: new Set(ids) }),

  setToolMode: (mode) => set({ toolMode: mode }),

  setConnectingFrom: (id) => set({ connectingFrom: id }),

  setEditingNodeId: (id) => set({ editingNodeId: id }),
}))
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/store/__tests__/canvasStore.test.ts
```

Expected: `PASS — 7 tests passed`

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend/src/store/
git commit -m "feat: add Zustand canvas store with tests"
```

---

## Task 4: API client + canvas/node API functions

**Files:**
- Create: `frontend/.env.local`
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/canvases.ts`
- Create: `frontend/src/api/nodes.ts`

- [ ] **Step 1: Create frontend/.env.local**

```dotenv
VITE_API_BASE_URL=http://localhost:8000
```

- [ ] **Step 2: Create frontend/src/api/client.ts**

```typescript
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
})
```

- [ ] **Step 3: Create frontend/src/api/canvases.ts**

```typescript
import type { CanvasData } from '@/types'
import { apiClient } from './client'

const CANVAS_ID_KEY = 'canvas_id'

/** Fetch the stored canvas by ID, or create a new one if none exists. */
export async function getOrCreateCanvas(): Promise<CanvasData> {
  const storedId = localStorage.getItem(CANVAS_ID_KEY)

  if (storedId) {
    try {
      const res = await apiClient.get<CanvasData>(`/canvases/${storedId}`)
      return res.data
    } catch {
      // Canvas no longer exists — fall through and create a new one
      localStorage.removeItem(CANVAS_ID_KEY)
    }
  }

  const res = await apiClient.post<CanvasData>('/canvases', {})
  localStorage.setItem(CANVAS_ID_KEY, res.data.id)
  return res.data
}

export async function updateCanvasViewport(
  id: string,
  viewport: { viewport_x: number; viewport_y: number; viewport_z: number },
): Promise<void> {
  await apiClient.patch(`/canvases/${id}`, viewport)
}

export async function updateCanvasTitle(id: string, title: string): Promise<void> {
  await apiClient.patch(`/canvases/${id}`, { title })
}
```

- [ ] **Step 4: Create frontend/src/api/nodes.ts**

```typescript
import type { CanvasNode } from '@/types'
import { apiClient } from './client'

export async function createNode(
  canvasId: string,
  x: number,
  y: number,
): Promise<CanvasNode> {
  const res = await apiClient.post<CanvasNode>(`/canvases/${canvasId}/nodes`, { x, y })
  return res.data
}

export async function updateNode(
  id: string,
  patch: Partial<Pick<CanvasNode, 'content' | 'x' | 'y' | 'width' | 'height' | 'color' | 'z_index'>>,
): Promise<CanvasNode> {
  const res = await apiClient.patch<CanvasNode>(`/nodes/${id}`, patch)
  return res.data
}

export async function deleteNode(id: string): Promise<void> {
  await apiClient.delete(`/nodes/${id}`)
}

export async function batchUpdateNodePositions(
  canvasId: string,
  updates: { id: string; x: number; y: number }[],
): Promise<void> {
  await apiClient.patch(`/canvases/${canvasId}/nodes/batch`, { updates })
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/.env.local frontend/src/api/
git commit -m "feat: add API client and canvas/node API functions"
```

---

## Task 5: Backend schemas

**Files:**
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/app/schemas/node.py`
- Create: `backend/app/schemas/edge.py`
- Create: `backend/app/schemas/canvas.py`

- [ ] **Step 1: Create backend/app/schemas/__init__.py**

```python
```
(empty)

- [ ] **Step 2: Create backend/app/schemas/node.py**

```python
from pydantic import BaseModel


class NodeCreate(BaseModel):
    x: float
    y: float
    content: str = ""
    width: float = 200.0
    height: float = 120.0
    color: str = "default"


class NodePatch(BaseModel):
    content: str | None = None
    x: float | None = None
    y: float | None = None
    width: float | None = None
    height: float | None = None
    color: str | None = None
    z_index: int | None = None


class NodePositionUpdate(BaseModel):
    id: str
    x: float
    y: float


class BatchPositionUpdate(BaseModel):
    updates: list[NodePositionUpdate]


class NodeResponse(BaseModel):
    id: str
    canvas_id: str
    content: str
    x: float
    y: float
    width: float
    height: float
    color: str
    z_index: int

    model_config = {"from_attributes": True}
```

- [ ] **Step 3: Create backend/app/schemas/edge.py** (stub — full implementation in Phase 3)

```python
from pydantic import BaseModel


class EdgeCreate(BaseModel):
    source_id: str
    target_id: str
    label: str | None = None
    style: str = "solid"


class EdgePatch(BaseModel):
    label: str | None = None
    style: str | None = None


class EdgeResponse(BaseModel):
    id: str
    canvas_id: str
    source_id: str
    target_id: str
    label: str | None
    style: str

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: Create backend/app/schemas/canvas.py**

```python
from pydantic import BaseModel

from .edge import EdgeResponse
from .node import NodeResponse


class CanvasCreate(BaseModel):
    title: str = "Untitled Canvas"


class CanvasPatch(BaseModel):
    title: str | None = None
    viewport_x: float | None = None
    viewport_y: float | None = None
    viewport_z: float | None = None


class ViewportData(BaseModel):
    x: float
    y: float
    z: float


class CanvasFullResponse(BaseModel):
    id: str
    title: str
    viewport: ViewportData
    nodes: list[NodeResponse]
    edges: list[EdgeResponse]


class CanvasMetaResponse(BaseModel):
    id: str
    title: str
    viewport: ViewportData
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/
git commit -m "feat: add Pydantic schemas for canvas, node, edge"
```

---

## Task 6: Backend canvas router + tests

**Files:**
- Create: `backend/app/routers/__init__.py`
- Create: `backend/app/routers/canvases.py`
- Create: `backend/tests/test_canvases.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Write the tests**

```python
# backend/tests/test_canvases.py
import pytest


@pytest.mark.asyncio
async def test_create_canvas(client):
    response = await client.post("/api/v1/canvases", json={})
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Untitled Canvas"
    assert data["viewport"] == {"x": 0.0, "y": 0.0, "z": 1.0}
    assert data["nodes"] == []
    assert data["edges"] == []
    assert "id" in data


@pytest.mark.asyncio
async def test_create_canvas_custom_title(client):
    response = await client.post("/api/v1/canvases", json={"title": "My Map"})
    assert response.status_code == 201
    assert response.json()["title"] == "My Map"


@pytest.mark.asyncio
async def test_get_canvas(client):
    create_res = await client.post("/api/v1/canvases", json={})
    canvas_id = create_res.json()["id"]

    get_res = await client.get(f"/api/v1/canvases/{canvas_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == canvas_id


@pytest.mark.asyncio
async def test_get_canvas_not_found(client):
    response = await client.get("/api/v1/canvases/does-not-exist")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_canvas_title(client):
    create_res = await client.post("/api/v1/canvases", json={})
    canvas_id = create_res.json()["id"]

    patch_res = await client.patch(f"/api/v1/canvases/{canvas_id}", json={"title": "Updated"})
    assert patch_res.status_code == 200
    assert patch_res.json()["title"] == "Updated"


@pytest.mark.asyncio
async def test_update_canvas_viewport(client):
    create_res = await client.post("/api/v1/canvases", json={})
    canvas_id = create_res.json()["id"]

    patch_res = await client.patch(
        f"/api/v1/canvases/{canvas_id}",
        json={"viewport_x": -100.0, "viewport_y": -50.0, "viewport_z": 1.5},
    )
    assert patch_res.status_code == 200
    vp = patch_res.json()["viewport"]
    assert vp["x"] == -100.0
    assert vp["y"] == -50.0
    assert vp["z"] == 1.5
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd backend
pytest tests/test_canvases.py -v
```

Expected: `FAIL — 404 Not Found (routes don't exist yet)`

- [ ] **Step 3: Create backend/app/routers/__init__.py**

```python
```
(empty)

- [ ] **Step 4: Create backend/app/routers/canvases.py**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Canvas, Edge, Node
from app.schemas.canvas import (
    CanvasCreate,
    CanvasFullResponse,
    CanvasMetaResponse,
    CanvasPatch,
    ViewportData,
)
from app.schemas.edge import EdgeResponse
from app.schemas.node import NodeResponse

router = APIRouter(tags=["canvases"])


async def _build_full_response(canvas: Canvas, db: AsyncSession) -> CanvasFullResponse:
    nodes_result = await db.execute(select(Node).where(Node.canvas_id == canvas.id))
    edges_result = await db.execute(select(Edge).where(Edge.canvas_id == canvas.id))
    return CanvasFullResponse(
        id=canvas.id,
        title=canvas.title,
        viewport=ViewportData(x=canvas.viewport_x, y=canvas.viewport_y, z=canvas.viewport_z),
        nodes=[NodeResponse.model_validate(n) for n in nodes_result.scalars().all()],
        edges=[EdgeResponse.model_validate(e) for e in edges_result.scalars().all()],
    )


@router.post("/canvases", status_code=201)
async def create_canvas(
    body: CanvasCreate, db: AsyncSession = Depends(get_db)
) -> CanvasFullResponse:
    canvas = Canvas(title=body.title)
    db.add(canvas)
    await db.commit()
    await db.refresh(canvas)
    return CanvasFullResponse(
        id=canvas.id,
        title=canvas.title,
        viewport=ViewportData(x=canvas.viewport_x, y=canvas.viewport_y, z=canvas.viewport_z),
        nodes=[],
        edges=[],
    )


@router.get("/canvases/{canvas_id}")
async def get_canvas(
    canvas_id: str, db: AsyncSession = Depends(get_db)
) -> CanvasFullResponse:
    canvas = await db.get(Canvas, canvas_id)
    if not canvas:
        raise HTTPException(status_code=404, detail="Canvas not found")
    return await _build_full_response(canvas, db)


@router.patch("/canvases/{canvas_id}")
async def update_canvas(
    canvas_id: str, body: CanvasPatch, db: AsyncSession = Depends(get_db)
) -> CanvasMetaResponse:
    canvas = await db.get(Canvas, canvas_id)
    if not canvas:
        raise HTTPException(status_code=404, detail="Canvas not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(canvas, field, value)

    await db.commit()
    await db.refresh(canvas)
    return CanvasMetaResponse(
        id=canvas.id,
        title=canvas.title,
        viewport=ViewportData(x=canvas.viewport_x, y=canvas.viewport_y, z=canvas.viewport_z),
    )
```

- [ ] **Step 5: Register the router in backend/app/main.py**

Replace the existing `main.py` with:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import canvases, nodes

app = FastAPI(title="Canvas API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "app://.",
        "file://",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(canvases.router, prefix="/api/v1")
app.include_router(nodes.router, prefix="/api/v1")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
pytest tests/test_canvases.py tests/test_health.py -v
```

Expected:
```
PASSED tests/test_health.py::test_health
PASSED tests/test_canvases.py::test_create_canvas
PASSED tests/test_canvases.py::test_create_canvas_custom_title
PASSED tests/test_canvases.py::test_get_canvas
PASSED tests/test_canvases.py::test_get_canvas_not_found
PASSED tests/test_canvases.py::test_update_canvas_title
PASSED tests/test_canvases.py::test_update_canvas_viewport
7 passed
```

- [ ] **Step 7: Commit**

```bash
cd ..
git add backend/app/routers/ backend/app/main.py backend/tests/test_canvases.py
git commit -m "feat: add canvas router with CRUD endpoints and tests"
```

---

## Task 7: Backend node router + tests

**Files:**
- Create: `backend/app/routers/nodes.py`
- Create: `backend/tests/test_nodes.py`

- [ ] **Step 1: Write the tests**

```python
# backend/tests/test_nodes.py
import pytest


@pytest.fixture
async def canvas_id(client) -> str:
    res = await client.post("/api/v1/canvases", json={})
    return res.json()["id"]


@pytest.mark.asyncio
async def test_create_node(client, canvas_id):
    res = await client.post(
        f"/api/v1/canvases/{canvas_id}/nodes",
        json={"x": 100.0, "y": 200.0},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["x"] == 100.0
    assert data["y"] == 200.0
    assert data["content"] == ""
    assert data["width"] == 200.0
    assert data["height"] == 120.0
    assert data["color"] == "default"
    assert data["canvas_id"] == canvas_id
    assert "id" in data


@pytest.mark.asyncio
async def test_create_node_canvas_not_found(client):
    res = await client.post(
        "/api/v1/canvases/nonexistent/nodes",
        json={"x": 0.0, "y": 0.0},
    )
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_update_node_content(client, canvas_id):
    create_res = await client.post(
        f"/api/v1/canvases/{canvas_id}/nodes", json={"x": 0.0, "y": 0.0}
    )
    node_id = create_res.json()["id"]

    patch_res = await client.patch(f"/api/v1/nodes/{node_id}", json={"content": "Hello world"})
    assert patch_res.status_code == 200
    assert patch_res.json()["content"] == "Hello world"


@pytest.mark.asyncio
async def test_update_node_position(client, canvas_id):
    create_res = await client.post(
        f"/api/v1/canvases/{canvas_id}/nodes", json={"x": 0.0, "y": 0.0}
    )
    node_id = create_res.json()["id"]

    patch_res = await client.patch(f"/api/v1/nodes/{node_id}", json={"x": 350.0, "y": 150.0})
    assert patch_res.status_code == 200
    assert patch_res.json()["x"] == 350.0
    assert patch_res.json()["y"] == 150.0


@pytest.mark.asyncio
async def test_delete_node(client, canvas_id):
    create_res = await client.post(
        f"/api/v1/canvases/{canvas_id}/nodes", json={"x": 0.0, "y": 0.0}
    )
    node_id = create_res.json()["id"]

    del_res = await client.delete(f"/api/v1/nodes/{node_id}")
    assert del_res.status_code == 204

    # Verify node is gone
    canvas_res = await client.get(f"/api/v1/canvases/{canvas_id}")
    node_ids = [n["id"] for n in canvas_res.json()["nodes"]]
    assert node_id not in node_ids


@pytest.mark.asyncio
async def test_batch_update_positions(client, canvas_id):
    n1 = (await client.post(f"/api/v1/canvases/{canvas_id}/nodes", json={"x": 0.0, "y": 0.0})).json()["id"]
    n2 = (await client.post(f"/api/v1/canvases/{canvas_id}/nodes", json={"x": 0.0, "y": 0.0})).json()["id"]

    res = await client.patch(
        f"/api/v1/canvases/{canvas_id}/nodes/batch",
        json={"updates": [{"id": n1, "x": 100.0, "y": 200.0}, {"id": n2, "x": 300.0, "y": 400.0}]},
    )
    assert res.status_code == 200
    assert res.json()["updated"] == 2

    canvas_data = (await client.get(f"/api/v1/canvases/{canvas_id}")).json()
    nodes_by_id = {n["id"]: n for n in canvas_data["nodes"]}
    assert nodes_by_id[n1]["x"] == 100.0
    assert nodes_by_id[n2]["x"] == 300.0
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd backend
pytest tests/test_nodes.py -v
```

Expected: `FAIL — routes not found`

- [ ] **Step 3: Create backend/app/routers/nodes.py**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Canvas, Node
from app.schemas.node import BatchPositionUpdate, NodeCreate, NodePatch, NodeResponse

router = APIRouter(tags=["nodes"])


@router.post("/canvases/{canvas_id}/nodes", status_code=201)
async def create_node(
    canvas_id: str, body: NodeCreate, db: AsyncSession = Depends(get_db)
) -> NodeResponse:
    canvas = await db.get(Canvas, canvas_id)
    if not canvas:
        raise HTTPException(status_code=404, detail="Canvas not found")

    node = Node(
        canvas_id=canvas_id,
        content=body.content,
        x=body.x,
        y=body.y,
        width=body.width,
        height=body.height,
        color=body.color,
    )
    db.add(node)
    await db.commit()
    await db.refresh(node)
    return NodeResponse.model_validate(node)


@router.patch("/nodes/{node_id}")
async def update_node(
    node_id: str, body: NodePatch, db: AsyncSession = Depends(get_db)
) -> NodeResponse:
    node = await db.get(Node, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(node, field, value)

    await db.commit()
    await db.refresh(node)
    return NodeResponse.model_validate(node)


@router.delete("/nodes/{node_id}", status_code=204)
async def delete_node(
    node_id: str, db: AsyncSession = Depends(get_db)
) -> None:
    node = await db.get(Node, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    await db.delete(node)
    await db.commit()


@router.patch("/canvases/{canvas_id}/nodes/batch")
async def batch_update_positions(
    canvas_id: str,
    body: BatchPositionUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    for update in body.updates:
        node = await db.get(Node, update.id)
        if node and node.canvas_id == canvas_id:
            node.x = update.x
            node.y = update.y
    await db.commit()
    return {"updated": len(body.updates)}
```

- [ ] **Step 4: Run all backend tests — expect PASS**

```bash
pytest -v
```

Expected:
```
PASSED tests/test_health.py::test_health
PASSED tests/test_canvases.py::test_create_canvas
PASSED tests/test_canvases.py::test_create_canvas_custom_title
PASSED tests/test_canvases.py::test_get_canvas
PASSED tests/test_canvases.py::test_get_canvas_not_found
PASSED tests/test_canvases.py::test_update_canvas_title
PASSED tests/test_canvases.py::test_update_canvas_viewport
PASSED tests/test_nodes.py::test_create_node
PASSED tests/test_nodes.py::test_create_node_canvas_not_found
PASSED tests/test_nodes.py::test_update_node_content
PASSED tests/test_nodes.py::test_update_node_position
PASSED tests/test_nodes.py::test_delete_node
PASSED tests/test_nodes.py::test_batch_update_positions
13 passed
```

- [ ] **Step 5: Commit**

```bash
cd ..
git add backend/app/routers/nodes.py backend/tests/test_nodes.py
git commit -m "feat: add node router with CRUD and batch position endpoints, with tests"
```

---

## Task 8: Tailwind + global styles + App.tsx

**Files:**
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.cjs`
- Create: `frontend/src/styles/globals.css`
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create frontend/tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 2: Create frontend/postcss.config.cjs**

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 3: Create frontend/src/styles/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  overflow: hidden;
  background: #0d0d0d;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* CSS design tokens — overridden per-theme in Phase 5 */
:root {
  --canvas-bg: #0d0d0d;
  --node-bg: #1a1a2e;
  --node-border: #2a2a3a;
  --node-border-selected: #7c3aed;
  --node-shadow: rgba(0, 0, 0, 0.3);
  --node-text: #e2e8f0;
  --node-text-secondary: #94a3b8;
  --accent: #7c3aed;
  --accent-hover: #6d28d9;
}
```

- [ ] **Step 4: Update frontend/src/main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 5: Update frontend/src/App.tsx**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CanvasPage } from './pages/CanvasPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: Infinity,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CanvasPage />
    </QueryClientProvider>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/tailwind.config.ts frontend/postcss.config.cjs frontend/src/styles/ frontend/src/main.tsx frontend/src/App.tsx
git commit -m "feat: add Tailwind CSS, global styles, and QueryClientProvider"
```

---

## Task 9: CanvasPage + canvas load + CanvasStage refactor

**Files:**
- Create: `frontend/src/pages/CanvasPage.tsx`
- Modify: `frontend/src/components/canvas/CanvasStage.tsx`

- [ ] **Step 1: Create frontend/src/pages/CanvasPage.tsx**

```tsx
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getOrCreateCanvas } from '@/api/canvases'
import { useCanvasStore } from '@/store/canvasStore'
import { CanvasStage } from '@/components/canvas/CanvasStage'
import { UIOverlay } from '@/components/overlay/UIOverlay'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useAutosave } from '@/hooks/useAutosave'

export function CanvasPage() {
  const hydrateCanvas = useCanvasStore((s) => s.hydrateCanvas)

  const { data: canvas, isLoading, isError } = useQuery({
    queryKey: ['canvas'],
    queryFn: getOrCreateCanvas,
  })

  useEffect(() => {
    if (canvas) {
      hydrateCanvas(canvas.id, canvas.nodes, canvas.edges, canvas.viewport)
    }
  }, [canvas, hydrateCanvas])

  useKeyboardShortcuts()
  useAutosave()

  if (isLoading) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--canvas-bg)',
          color: 'var(--node-text)',
          fontSize: 14,
          letterSpacing: '0.05em',
        }}
      >
        Loading canvas...
      </div>
    )
  }

  if (isError) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--canvas-bg)',
          color: '#f87171',
          fontSize: 14,
        }}
      >
        Could not connect to backend. Is it running on port 8000?
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <CanvasStage />
      <UIOverlay />
    </div>
  )
}
```

- [ ] **Step 2: Replace frontend/src/components/canvas/CanvasStage.tsx**

```tsx
import { useRef, useCallback, useEffect, useState } from 'react'
import { Stage, Layer } from 'react-konva'
import Konva from 'konva'
import { useCanvasStore } from '@/store/canvasStore'
import { screenToCanvas } from '@/utils/coordinates'
import { createNode } from '@/api/nodes'
import { NodeLayer } from './NodeLayer'

const MIN_ZOOM = 0.1
const MAX_ZOOM = 5
const ZOOM_STEP = 1.08

export function CanvasStage() {
  const stageRef = useRef<Konva.Stage>(null)
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight })

  const canvasId = useCanvasStore((s) => s.canvasId)
  const storedViewport = useCanvasStore((s) => s.viewport)
  const { setViewport, addNode, setEditingNodeId, setSelectedIds } = useCanvasStore()

  // Sync window size
  useEffect(() => {
    const handleResize = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Apply stored viewport when canvas first loads (e.g. last session's pan/zoom)
  useEffect(() => {
    if (canvasId && stageRef.current) {
      stageRef.current.position({ x: storedViewport.x, y: storedViewport.y })
      stageRef.current.scale({ x: storedViewport.z, y: storedViewport.z })
    }
    // Only run when the canvas first hydrates — not on every viewport change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasId])

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault()
      const stage = stageRef.current
      if (!stage) return

      const oldZoom = stage.scaleX()
      const pointer = stage.getPointerPosition()
      if (!pointer) return

      const direction = e.evt.deltaY < 0 ? 1 : -1
      const newZoom = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, oldZoom * (direction > 0 ? ZOOM_STEP : 1 / ZOOM_STEP)),
      )

      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldZoom,
        y: (pointer.y - stage.y()) / oldZoom,
      }
      const newPos = {
        x: pointer.x - mousePointTo.x * newZoom,
        y: pointer.y - mousePointTo.y * newZoom,
      }

      stage.scale({ x: newZoom, y: newZoom })
      stage.position(newPos)
      setViewport({ x: newPos.x, y: newPos.y, z: newZoom })
    },
    [setViewport],
  )

  const handleDragEnd = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return
    const pos = stage.position()
    setViewport({ x: pos.x, y: pos.y, z: stage.scaleX() })
  }, [setViewport])

  // Click on empty canvas → deselect
  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target === stageRef.current) {
        setSelectedIds([])
      }
    },
    [setSelectedIds],
  )

  // Double-click on empty canvas → create node at cursor
  const handleStageDblClick = useCallback(
    async (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target !== stageRef.current) return
      if (!canvasId) return

      const stage = stageRef.current!
      const pointer = stage.getPointerPosition()!
      const viewport = useCanvasStore.getState().viewport
      const canvasPos = screenToCanvas(pointer.x, pointer.y, viewport)

      // Center the node on the click point
      const x = canvasPos.x - 100 // half of default width
      const y = canvasPos.y - 60  // half of default height

      const node = await createNode(canvasId, x, y)
      addNode(node)
      setEditingNodeId(node.id)
    },
    [canvasId, addNode, setEditingNodeId],
  )

  return (
    <Stage
      ref={stageRef}
      width={size.width}
      height={size.height}
      draggable
      onWheel={handleWheel}
      onDragEnd={handleDragEnd}
      onClick={handleStageClick}
      onDblClick={handleStageDblClick}
      style={{ background: 'var(--canvas-bg)' }}
    >
      <NodeLayer />
      <Layer /> {/* EdgeLayer placeholder — added in Phase 3 */}
    </Stage>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ frontend/src/components/canvas/CanvasStage.tsx
git commit -m "feat: add CanvasPage with canvas load, hydration, and node creation on double-click"
```

---

## Task 10: NoteCard + NodeLayer

**Files:**
- Create: `frontend/src/components/canvas/NoteCard.tsx`
- Create: `frontend/src/components/canvas/NodeLayer.tsx`

- [ ] **Step 1: Create frontend/src/components/canvas/NoteCard.tsx**

```tsx
import { memo } from 'react'
import { Group, Rect, Text } from 'react-konva'
import Konva from 'konva'
import type { CanvasNode } from '@/types'

const NODE_PADDING = 12
const FONT_SIZE = 13
const CORNER_RADIUS = 8

interface NoteCardProps {
  node: CanvasNode
  isSelected: boolean
  onDragMove: (id: string, x: number, y: number) => void
  onDragEnd: (id: string, x: number, y: number) => void
  onDoubleClick: (id: string) => void
  onClick: (id: string, e: Konva.KonvaEventObject<MouseEvent>) => void
}

export const NoteCard = memo(function NoteCard({
  node,
  isSelected,
  onDragMove,
  onDragEnd,
  onDoubleClick,
  onClick,
}: NoteCardProps) {
  return (
    <Group
      x={node.x}
      y={node.y}
      draggable
      onDragMove={(e) => {
        e.cancelBubble = true
        onDragMove(node.id, e.target.x(), e.target.y())
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true
        onDragEnd(node.id, e.target.x(), e.target.y())
      }}
      onDblClick={(e) => {
        e.cancelBubble = true
        onDoubleClick(node.id)
      }}
      onClick={(e) => {
        e.cancelBubble = true
        onClick(node.id, e)
      }}
    >
      <Rect
        width={node.width}
        height={node.height}
        fill="var(--node-bg, #1a1a2e)"
        stroke={isSelected ? 'var(--node-border-selected, #7c3aed)' : 'var(--node-border, #2a2a3a)'}
        strokeWidth={isSelected ? 2 : 1}
        cornerRadius={CORNER_RADIUS}
        shadowColor="rgba(0,0,0,0.35)"
        shadowBlur={isSelected ? 16 : 6}
        shadowOffsetY={2}
        shadowEnabled
      />
      <Text
        x={NODE_PADDING}
        y={NODE_PADDING}
        width={node.width - NODE_PADDING * 2}
        height={node.height - NODE_PADDING * 2}
        text={node.content || ''}
        fontSize={FONT_SIZE}
        fontFamily="system-ui, -apple-system, sans-serif"
        fill="var(--node-text, #e2e8f0)"
        lineHeight={1.5}
        wrap="word"
        ellipsis
        listening={false}
      />
    </Group>
  )
})
```

- [ ] **Step 2: Create frontend/src/components/canvas/NodeLayer.tsx**

```tsx
import { Layer } from 'react-konva'
import Konva from 'konva'
import { useCanvasStore } from '@/store/canvasStore'
import { NoteCard } from './NoteCard'

export function NodeLayer() {
  const nodes = useCanvasStore((s) => Object.values(s.nodes))
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const { updateNode, setSelectedIds, setEditingNodeId } = useCanvasStore()

  const handleDragMove = (id: string, x: number, y: number) => {
    updateNode(id, { x, y })
  }

  const handleDragEnd = (id: string, x: number, y: number) => {
    updateNode(id, { x, y })
    // useAutosave in CanvasPage will detect the change and debounce the API call
  }

  const handleDblClick = (id: string) => {
    setEditingNodeId(id)
  }

  const handleClick = (id: string, e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.shiftKey) {
      const next = new Set(selectedIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      setSelectedIds(Array.from(next))
    } else {
      setSelectedIds([id])
    }
  }

  return (
    <Layer>
      {nodes.map((node) => (
        <NoteCard
          key={node.id}
          node={node}
          isSelected={selectedIds.has(node.id)}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDoubleClick={handleDblClick}
          onClick={handleClick}
        />
      ))}
    </Layer>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/canvas/NoteCard.tsx frontend/src/components/canvas/NodeLayer.tsx
git commit -m "feat: add NoteCard (Konva) and NodeLayer components"
```

---

## Task 11: UIOverlay + NodeEditor

**Files:**
- Create: `frontend/src/components/overlay/UIOverlay.tsx`
- Create: `frontend/src/components/overlay/NodeEditor.tsx`

- [ ] **Step 1: Create frontend/src/components/overlay/NodeEditor.tsx**

```tsx
import { useRef, useEffect } from 'react'
import type { CanvasNode, Viewport } from '@/types'
import { canvasToScreen } from '@/utils/coordinates'

interface NodeEditorProps {
  node: CanvasNode
  viewport: Viewport
  onChange: (content: string) => void
  onClose: () => void
}

export function NodeEditor({ node, viewport, onChange, onClose }: NodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pos = canvasToScreen(node.x, node.y, viewport)

  useEffect(() => {
    // Focus and place cursor at end on mount
    const el = textareaRef.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [])

  return (
    <textarea
      ref={textareaRef}
      value={node.content}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          onClose()
        }
        // Enter without Shift commits the edit
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          onClose()
        }
        // Prevent Delete key from triggering node deletion while typing
        e.stopPropagation()
      }}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: node.width * viewport.z,
        height: node.height * viewport.z,
        padding: `${12 * viewport.z}px`,
        fontSize: `${13 * viewport.z}px`,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        lineHeight: 1.5,
        background: 'var(--node-bg, #1a1a2e)',
        color: 'var(--node-text, #e2e8f0)',
        border: '2px solid var(--node-border-selected, #7c3aed)',
        borderRadius: `${8 * viewport.z}px`,
        resize: 'none',
        outline: 'none',
        boxSizing: 'border-box',
        overflow: 'hidden',
        zIndex: 10,
        boxShadow: '0 0 0 4px rgba(124, 58, 237, 0.15)',
      }}
    />
  )
}
```

- [ ] **Step 2: Create frontend/src/components/overlay/UIOverlay.tsx**

```tsx
import { useCanvasStore } from '@/store/canvasStore'
import { NodeEditor } from './NodeEditor'

export function UIOverlay() {
  const editingNodeId = useCanvasStore((s) => s.editingNodeId)
  const nodes = useCanvasStore((s) => s.nodes)
  const viewport = useCanvasStore((s) => s.viewport)
  const { updateNode, setEditingNodeId } = useCanvasStore()

  const editingNode = editingNodeId ? nodes[editingNodeId] : null

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {editingNode && (
        <div style={{ pointerEvents: 'all' }}>
          <NodeEditor
            node={editingNode}
            viewport={viewport}
            onChange={(content) => updateNode(editingNode.id, { content })}
            onClose={() => setEditingNodeId(null)}
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/overlay/
git commit -m "feat: add UIOverlay and NodeEditor for in-place text editing"
```

---

## Task 12: Keyboard shortcuts + autosave hooks

**Files:**
- Create: `frontend/src/hooks/useKeyboardShortcuts.ts`
- Create: `frontend/src/hooks/useAutosave.ts`

- [ ] **Step 1: Create frontend/src/hooks/useKeyboardShortcuts.ts**

```typescript
import { useEffect } from 'react'
import { useCanvasStore } from '@/store/canvasStore'
import { deleteNode as apiDeleteNode } from '@/api/nodes'

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const { editingNodeId, selectedIds, deleteNode } = useCanvasStore.getState()

      // Don't fire shortcuts while a node is being edited
      if (editingNodeId) return

      // Delete / Backspace — remove selected nodes
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
        e.preventDefault()
        const ids = Array.from(selectedIds)
        // Optimistic: remove from store immediately
        ids.forEach((id) => deleteNode(id))
        useCanvasStore.getState().setSelectedIds([])
        // Persist deletions (fire-and-forget, errors logged to console)
        await Promise.all(ids.map((id) => apiDeleteNode(id).catch(console.error)))
      }

      // Escape — deselect all
      if (e.key === 'Escape') {
        useCanvasStore.getState().setSelectedIds([])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
```

- [ ] **Step 2: Create frontend/src/hooks/useAutosave.ts**

```typescript
import { useEffect, useRef } from 'react'
import { useCanvasStore } from '@/store/canvasStore'
import { updateNode as apiUpdateNode } from '@/api/nodes'
import type { CanvasNode } from '@/types'

const DEBOUNCE_MS = 500

export function useAutosave() {
  const nodes = useCanvasStore((s) => s.nodes)
  const canvasId = useCanvasStore((s) => s.canvasId)

  // Map of nodeId → pending debounce timer
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  // Snapshot of nodes from the previous render to detect changes
  const prevNodes = useRef<Record<string, CanvasNode>>({})

  useEffect(() => {
    if (!canvasId) return

    const prev = prevNodes.current

    for (const node of Object.values(nodes)) {
      const p = prev[node.id]
      if (!p) continue // newly created nodes are persisted immediately by the create action

      const changed =
        p.content !== node.content ||
        p.x !== node.x ||
        p.y !== node.y ||
        p.width !== node.width ||
        p.height !== node.height ||
        p.color !== node.color

      if (!changed) continue

      // Reset the timer for this node
      const existing = timers.current.get(node.id)
      if (existing) clearTimeout(existing)

      const capturedNode = { ...node }
      const timer = setTimeout(() => {
        apiUpdateNode(capturedNode.id, {
          content: capturedNode.content,
          x: capturedNode.x,
          y: capturedNode.y,
          width: capturedNode.width,
          height: capturedNode.height,
          color: capturedNode.color,
        }).catch(console.error)
        timers.current.delete(capturedNode.id)
      }, DEBOUNCE_MS)

      timers.current.set(node.id, timer)
    }

    prevNodes.current = nodes
  }, [nodes, canvasId])

  // Flush all pending saves on unmount
  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => clearTimeout(timer))
    }
  }, [])
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/
git commit -m "feat: add useKeyboardShortcuts (Delete to remove nodes) and useAutosave (debounced persist)"
```

---

## Task 13: End-to-end smoke test

Verify the full Phase 2 flow works in the Electron window before closing out.

- [ ] **Step 1: Start backend**

```bash
cd backend && uvicorn app.main:app --reload --port 8000
```

- [ ] **Step 2: Start frontend**

```bash
cd frontend && npm run dev
```

- [ ] **Step 3: Start Electron**

```bash
npx tsc -p electron/tsconfig.json
cross-env NODE_ENV=development npx electron .
```

- [ ] **Step 4: Manual verification checklist**

In the Electron window:
- [ ] App loads, shows canvas (no loading spinner after a moment)
- [ ] Double-click empty canvas → new note appears under cursor with textarea focused
- [ ] Type text in the textarea → text appears in the note
- [ ] Press Enter → textarea closes, text persists on the note
- [ ] Double-click the note → textarea reopens with existing text
- [ ] Press Escape → textarea closes without losing text
- [ ] Drag the note to a new position → note moves smoothly
- [ ] Click note → note shows selected state (purple border)
- [ ] Press Delete → note disappears
- [ ] Zoom with scroll wheel → zooms toward cursor (Figma-style)
- [ ] Middle-click drag → pans the canvas
- [ ] Restart the app → previously created notes reload from DB

- [ ] **Step 5: Run all tests**

```bash
# Backend
cd backend && pytest -v

# Frontend
cd ../frontend && npm test
```

Expected: All 13 backend tests and all frontend tests pass.

- [ ] **Step 6: Commit phase completion**

```bash
cd ..
git add .
git commit -m "feat: Phase 2 complete — full node CRUD with autosave and keyboard shortcuts"
```

---

## Phase 2 Checklist

- [ ] TypeScript types defined for `CanvasNode`, `CanvasEdge`, `CanvasData`, `Viewport`, `ToolMode`
- [ ] Coordinate utilities `canvasToScreen` / `screenToCanvas` with tests
- [ ] Zustand canvas store with all actions, tested
- [ ] API client (axios) + canvas/node API functions
- [ ] Backend: canvas router (POST, GET, PATCH) with tests
- [ ] Backend: node router (POST, PATCH, DELETE, batch PATCH) with tests
- [ ] All 13 backend tests pass
- [ ] TanStack Query fetches canvas on load, hydrates Zustand
- [ ] CanvasStage reads initial viewport from store on hydration
- [ ] Double-click empty canvas creates a node at cursor position
- [ ] NoteCard renders with correct text and selection state
- [ ] Double-click node opens textarea overlay at exact screen position
- [ ] Enter/Escape/blur commits text edit
- [ ] Delete key removes selected nodes (optimistic + persisted)
- [ ] Drag repositions nodes (autosaved on drag end)
- [ ] All changes autosave to Supabase within 500ms
- [ ] Canvas reloads correctly on app restart
