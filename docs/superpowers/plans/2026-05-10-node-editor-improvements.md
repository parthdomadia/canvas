# Node Editor Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the node editor so Enter inserts a newline, "-" + Space creates bullet points, Ctrl+Shift+< / > adjusts per-node font size, and the editor makes exactly one DB call per session (on close) instead of one per keystroke.

**Architecture:** NodeEditor holds local `useState` for content and flushes to store + API only on Escape/blur. Bullet logic lives in a pure utility file (`editorBullets.ts`) so it can be tested independently. Font size is persisted per-node in the database. `useAutosave` is narrowed to exclude `content` — NodeEditor handles content saves directly.

**Tech Stack:** React 18, Zustand, Vitest, FastAPI, Supabase (Postgres), TypeScript.

---

## File Map

| File | Change |
|---|---|
| `backend/app/schemas/node.py` | Add `font_size: int = 13` to all three schemas |
| `backend/app/routers/nodes.py` | Include `font_size` in insert payload |
| `frontend/src/types/index.ts` | Add `font_size: number` to `CanvasNode` |
| `frontend/src/api/nodes.ts` | Add `font_size` to `updateNode` Pick type |
| `frontend/src/store/__tests__/canvasStore.test.ts` | Add `font_size: 13` to `mockNode` |
| `frontend/src/hooks/useAutosave.ts` | Remove `content` from change detection + API payload |
| `frontend/src/utils/editorBullets.ts` | Create — pure bullet transform functions |
| `frontend/src/utils/__tests__/editorBullets.test.ts` | Create — unit tests for bullet logic |
| `frontend/src/components/overlay/NodeEditor.tsx` | Full rewrite: local state, all keyboard logic, font size |
| `frontend/src/components/overlay/UIOverlay.tsx` | Remove `onChange` prop, remove `updateNode` from destructure |
| `frontend/src/components/canvas/NoteCard.tsx` | Replace `FONT_SIZE` constant with `node.font_size` |

---

## Task 1: Backend schema + DB migration

**Files:**
- Modify: `backend/app/schemas/node.py`
- Modify: `backend/app/routers/nodes.py`

- [ ] **Step 1: Run the Supabase migration**

Open the Supabase SQL editor for this project and run:

```sql
ALTER TABLE nodes ADD COLUMN font_size integer NOT NULL DEFAULT 13;
```

Verify by running `SELECT id, font_size FROM nodes LIMIT 5;` — all rows should show `13`.

- [ ] **Step 2: Update `backend/app/schemas/node.py`**

Replace the entire file:

```python
from pydantic import BaseModel


class NodeCreate(BaseModel):
    x: float
    y: float
    content: str = ""
    width: float = 200.0
    height: float = 120.0
    color: str = "default"
    font_size: int = 13


class NodePatch(BaseModel):
    content: str | None = None
    x: float | None = None
    y: float | None = None
    width: float | None = None
    height: float | None = None
    color: str | None = None
    z_index: int | None = None
    font_size: int | None = None


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
    font_size: int
```

- [ ] **Step 3: Update `backend/app/routers/nodes.py`**

Replace the entire file:

```python
import uuid

from fastapi import APIRouter, Depends, HTTPException
from supabase import AsyncClient

from app.database import get_supabase
from app.schemas.node import BatchPositionUpdate, NodeCreate, NodePatch, NodeResponse

router = APIRouter(tags=["nodes"])


@router.post("/canvases/{canvas_id}/nodes", status_code=201)
async def create_node(
    canvas_id: str,
    body: NodeCreate,
    supabase: AsyncClient = Depends(get_supabase),
) -> NodeResponse:
    check = await supabase.table("canvases").select("id").eq("id", canvas_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Canvas not found")

    node_id = str(uuid.uuid4())
    result = await supabase.table("nodes").insert({
        "id": node_id,
        "canvas_id": canvas_id,
        "content": body.content,
        "x": body.x,
        "y": body.y,
        "width": body.width,
        "height": body.height,
        "color": body.color,
        "z_index": 0,
        "font_size": body.font_size,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create node")

    return NodeResponse(**result.data[0])


@router.patch("/nodes/{node_id}")
async def update_node(
    node_id: str,
    body: NodePatch,
    supabase: AsyncClient = Depends(get_supabase),
) -> NodeResponse:
    check = await supabase.table("nodes").select("id").eq("id", node_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Node not found")

    update_data = body.model_dump(exclude_unset=True)
    result = await supabase.table("nodes").update(update_data).eq("id", node_id).execute()
    return NodeResponse(**result.data[0])


@router.delete("/nodes/{node_id}", status_code=204)
async def delete_node(
    node_id: str,
    supabase: AsyncClient = Depends(get_supabase),
) -> None:
    check = await supabase.table("nodes").select("id").eq("id", node_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Node not found")
    await supabase.table("nodes").delete().eq("id", node_id).execute()


@router.patch("/canvases/{canvas_id}/nodes/batch")
async def batch_update_positions(
    canvas_id: str,
    body: BatchPositionUpdate,
    supabase: AsyncClient = Depends(get_supabase),
) -> dict:
    for update in body.updates:
        await supabase.table("nodes").update({"x": update.x, "y": update.y}).eq("id", update.id).eq("canvas_id", canvas_id).execute()
    return {"updated": len(body.updates)}
```

- [ ] **Step 4: Verify backend starts**

```bash
cd /c/Users/parth/code_master/canvas/backend && uvicorn app.main:app --reload 2>&1 | head -5
```

Expected: `Application startup complete.` with no errors.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/parth/code_master/canvas && git add backend/app/schemas/node.py backend/app/routers/nodes.py && git commit -m "feat: add font_size field to node schema and router"
```

---

## Task 2: Frontend types + API

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/api/nodes.ts`
- Modify: `frontend/src/store/__tests__/canvasStore.test.ts`

- [ ] **Step 1: Update `frontend/src/types/index.ts`**

Replace the `CanvasNode` interface (add `font_size`):

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
  font_size: number
}

export interface CanvasEdge {
  id: string
  canvas_id: string
  source_id: string
  target_id: string
  label: string | null
  style: 'solid' | 'dashed' | 'dotted'
  edge_type: 'simple' | 'directed'
}

export interface Viewport {
  x: number
  y: number
  z: number
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

- [ ] **Step 2: Update `frontend/src/api/nodes.ts`**

Add `font_size` to the `updateNode` Pick type:

```typescript
import type { CanvasNode } from '@/types'
import { apiClient } from './client'

export async function createNode(
  canvasId: string,
  x: number,
  y: number,
  width?: number,
  height?: number,
): Promise<CanvasNode> {
  const body: { x: number; y: number; width?: number; height?: number } = { x, y }
  if (width !== undefined) body.width = width
  if (height !== undefined) body.height = height
  const res = await apiClient.post<CanvasNode>(`/canvases/${canvasId}/nodes`, body)
  return res.data
}

export async function updateNode(
  id: string,
  patch: Partial<Pick<CanvasNode, 'content' | 'x' | 'y' | 'width' | 'height' | 'color' | 'z_index' | 'font_size'>>,
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

- [ ] **Step 3: Add `font_size` to `mockNode` in tests**

In `frontend/src/store/__tests__/canvasStore.test.ts`, update `mockNode`:

```typescript
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
  font_size: 13,
}
```

- [ ] **Step 4: Run tests**

```bash
cd /c/Users/parth/code_master/canvas/frontend && npm test 2>&1 | tail -8
```

Expected: all 20 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/parth/code_master/canvas && git add frontend/src/types/index.ts frontend/src/api/nodes.ts frontend/src/store/__tests__/canvasStore.test.ts && git commit -m "feat: add font_size to CanvasNode type and API"
```

---

## Task 3: Bullet point utilities

**Files:**
- Create: `frontend/src/utils/editorBullets.ts`
- Create: `frontend/src/utils/__tests__/editorBullets.test.ts`

- [ ] **Step 1: Create the test file**

Create `frontend/src/utils/__tests__/editorBullets.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { applyBulletSpace, applyBulletEnter } from '../editorBullets'

describe('applyBulletSpace', () => {
  it('converts leading dash to bullet at start of document', () => {
    // User typed "-", cursor is at position 1, presses Space
    const result = applyBulletSpace('-', 1)
    expect(result).toEqual({ value: '• ', cursor: 2 })
  })

  it('converts leading dash to bullet mid-document', () => {
    // "line1\n-" with cursor at 7 (after "-")
    const result = applyBulletSpace('line1\n-', 7)
    expect(result).toEqual({ value: 'line1\n• ', cursor: 8 })
  })

  it('returns null when line has text before the dash', () => {
    const result = applyBulletSpace('some-', 5)
    expect(result).toBeNull()
  })

  it('returns null when current text is not a dash', () => {
    const result = applyBulletSpace('hello', 5)
    expect(result).toBeNull()
  })

  it('returns null when cursor is not right after the dash', () => {
    // "- text" with cursor at 0
    const result = applyBulletSpace('- text', 0)
    expect(result).toBeNull()
  })
})

describe('applyBulletEnter', () => {
  it('continues bullet when current line has content after bullet prefix', () => {
    // "• item" cursor at end (6)
    const result = applyBulletEnter('• item', 6)
    expect(result).toEqual({ value: '• item\n• ', cursor: 9 })
  })

  it('removes bullet when current line is empty bullet', () => {
    // "• " cursor at end (2) — empty bullet
    const result = applyBulletEnter('• ', 2)
    expect(result).toEqual({ value: '', cursor: 0 })
  })

  it('continues bullet mid-document', () => {
    // "line1\n• item" cursor at 12 (end)
    const result = applyBulletEnter('line1\n• item', 12)
    expect(result).toEqual({ value: 'line1\n• item\n• ', cursor: 15 })
  })

  it('removes empty bullet mid-document, preserving following lines', () => {
    // "• \nline2" cursor at 2 (after "• ")
    const result = applyBulletEnter('• \nline2', 2)
    expect(result).toEqual({ value: '\nline2', cursor: 0 })
  })

  it('returns null on non-bullet line', () => {
    const result = applyBulletEnter('normal text', 6)
    expect(result).toBeNull()
  })

  it('returns null on non-bullet line mid-document', () => {
    const result = applyBulletEnter('line1\nline2', 9)
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /c/Users/parth/code_master/canvas/frontend && npm test -- --reporter=verbose 2>&1 | grep -E "FAIL|Cannot find"
```

Expected: test file fails because `editorBullets.ts` does not exist yet.

- [ ] **Step 3: Create `frontend/src/utils/editorBullets.ts`**

```typescript
const BULLET = '• '

/**
 * Call when the user presses Space.
 * If the text from the start of the current line to the cursor is exactly "-",
 * replaces it with "• " and returns the new value + cursor position.
 * Returns null if no transformation applies.
 */
export function applyBulletSpace(
  value: string,
  cursor: number,
): { value: string; cursor: number } | null {
  const lineStart = value.lastIndexOf('\n', cursor - 1) + 1
  const textFromLineStart = value.slice(lineStart, cursor)
  if (textFromLineStart !== '-') return null

  const newValue = value.slice(0, lineStart) + BULLET + value.slice(cursor)
  return { value: newValue, cursor: lineStart + BULLET.length }
}

/**
 * Call when the user presses Enter.
 * If the current line starts with "• ":
 *   - Empty bullet ("• " with nothing after): removes the bullet prefix, no new line.
 *   - Non-empty bullet: inserts "\n• " at the cursor.
 * Returns null if the current line is not a bullet line (let default Enter behavior run).
 */
export function applyBulletEnter(
  value: string,
  cursor: number,
): { value: string; cursor: number } | null {
  const lineStart = value.lastIndexOf('\n', cursor - 1) + 1
  const lineEnd = value.indexOf('\n', cursor)
  const currentLine = value.slice(lineStart, lineEnd === -1 ? undefined : lineEnd)

  if (!currentLine.startsWith(BULLET)) return null

  const bulletContent = currentLine.slice(BULLET.length)

  if (bulletContent.trim() === '') {
    // Empty bullet: remove "• " from this line, place cursor at line start
    const newValue = value.slice(0, lineStart) + value.slice(lineStart + BULLET.length)
    return { value: newValue, cursor: lineStart }
  }

  // Non-empty bullet: continue with new bullet on next line
  const newValue = value.slice(0, cursor) + '\n' + BULLET + value.slice(cursor)
  return { value: newValue, cursor: cursor + 1 + BULLET.length }
}
```

- [ ] **Step 4: Run tests — all should pass**

```bash
cd /c/Users/parth/code_master/canvas/frontend && npm test -- --reporter=verbose 2>&1 | tail -15
```

Expected: all tests pass including the 11 new bullet tests (total ~31 tests).

- [ ] **Step 5: Commit**

```bash
cd /c/Users/parth/code_master/canvas && git add frontend/src/utils/editorBullets.ts frontend/src/utils/__tests__/editorBullets.test.ts && git commit -m "feat: bullet point transform utilities with tests"
```

---

## Task 4: Narrow useAutosave to exclude content

**Files:**
- Modify: `frontend/src/hooks/useAutosave.ts`

- [ ] **Step 1: Update `frontend/src/hooks/useAutosave.ts`**

Replace the entire file. The key changes: remove `content` from the `changed` check and from the `apiUpdateNode` payload. Content is now saved by NodeEditor directly on close.

```typescript
import { useEffect, useRef } from 'react'
import { useCanvasStore } from '@/store/canvasStore'
import { updateNode as apiUpdateNode } from '@/api/nodes'
import type { CanvasNode } from '@/types'

const DEBOUNCE_MS = 500

export function useAutosave() {
  const nodes = useCanvasStore((s) => s.nodes)
  const canvasId = useCanvasStore((s) => s.canvasId)

  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const prevNodes = useRef<Record<string, CanvasNode>>({})

  useEffect(() => {
    if (!canvasId) return

    const prev = prevNodes.current

    for (const node of Object.values(nodes)) {
      const p = prev[node.id]
      if (!p) continue

      // content is intentionally excluded — NodeEditor saves it directly on close
      const changed =
        p.x !== node.x ||
        p.y !== node.y ||
        p.width !== node.width ||
        p.height !== node.height ||
        p.color !== node.color

      if (!changed) continue

      const existing = timers.current.get(node.id)
      if (existing) clearTimeout(existing)

      const capturedNode = { ...node }
      const timer = setTimeout(() => {
        apiUpdateNode(capturedNode.id, {
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

  useEffect(() => {
    return () => { timers.current.forEach((timer) => clearTimeout(timer)) }
  }, [])
}
```

- [ ] **Step 2: Run tests**

```bash
cd /c/Users/parth/code_master/canvas/frontend && npm test 2>&1 | tail -8
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/parth/code_master/canvas && git add frontend/src/hooks/useAutosave.ts && git commit -m "refactor: remove content from autosave — NodeEditor saves on close"
```

---

## Task 5: NodeEditor rewrite + UIOverlay update

**Files:**
- Modify: `frontend/src/components/overlay/NodeEditor.tsx`
- Modify: `frontend/src/components/overlay/UIOverlay.tsx`

### Context

NodeEditor changes:
- Accepts `node`, `viewport`, `onClose` (drops `onChange` — content is managed internally)
- Local `useState<string>` for content, initialised from `node.content`
- On close (Escape or blur): flush content to store (`updateNode`) + direct `apiUpdateNode` call
- Enter: default textarea behaviour (newline) unless on a bullet line
- Space: bullet transform via `applyBulletSpace`
- Ctrl+Shift+< / >: adjust `node.font_size` immediately (store + API)
- `fontSize` style uses `node.font_size * viewport.z`

UIOverlay changes:
- Remove `onChange` prop from `<NodeEditor />`
- Remove `updateNode` from destructure (no longer needed here)

- [ ] **Step 1: Rewrite `frontend/src/components/overlay/NodeEditor.tsx`**

Read the current file first, then replace entirely:

```typescript
import { useState, useRef, useEffect, useCallback } from 'react'
import type { CanvasNode, Viewport } from '@/types'
import { canvasToScreen } from '@/utils/coordinates'
import { updateNode as apiUpdateNode } from '@/api/nodes'
import { useCanvasStore } from '@/store/canvasStore'
import { applyBulletSpace, applyBulletEnter } from '@/utils/editorBullets'

interface NodeEditorProps {
  node: CanvasNode
  viewport: Viewport
  onClose: () => void
}

export function NodeEditor({ node, viewport, onClose }: NodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [content, setContent] = useState(node.content)
  const updateNode = useCanvasStore((s) => s.updateNode)
  const pos = canvasToScreen(node.x, node.y, viewport)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [])

  const save = useCallback(() => {
    updateNode(node.id, { content })
    apiUpdateNode(node.id, { content }).catch(console.error)
  }, [node.id, content, updateNode])

  const handleBlur = useCallback(() => {
    save()
    onClose()
  }, [save, onClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      e.stopPropagation()
      const el = textareaRef.current
      if (!el) return

      // Font size: Ctrl+Shift+< (decrease) or Ctrl+Shift+> (increase)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === '<' || e.key === '>')) {
        e.preventDefault()
        const delta = e.key === '>' ? 1 : -1
        const newSize = Math.min(48, Math.max(8, node.font_size + delta))
        updateNode(node.id, { font_size: newSize })
        apiUpdateNode(node.id, { font_size: newSize }).catch(console.error)
        return
      }

      // Exit: Escape saves and closes
      if (e.key === 'Escape') {
        e.preventDefault()
        save()
        onClose()
        return
      }

      // Bullet: Space may transform "- " to "• "
      if (e.key === ' ') {
        const result = applyBulletSpace(el.value, el.selectionStart)
        if (result) {
          e.preventDefault()
          setContent(result.value)
          requestAnimationFrame(() => {
            el.setSelectionRange(result.cursor, result.cursor)
          })
          return
        }
      }

      // Bullet: Enter continues or deactivates bullet
      if (e.key === 'Enter') {
        const result = applyBulletEnter(el.value, el.selectionStart)
        if (result) {
          e.preventDefault()
          setContent(result.value)
          requestAnimationFrame(() => {
            el.setSelectionRange(result.cursor, result.cursor)
          })
          return
        }
        // Non-bullet line: let default textarea behaviour insert a newline
      }
    },
    [node.id, node.font_size, save, onClose, updateNode],
  )

  return (
    <textarea
      ref={textareaRef}
      value={content}
      onChange={(e) => setContent(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: node.width * viewport.z,
        height: node.height * viewport.z,
        padding: `${12 * viewport.z}px`,
        fontSize: `${node.font_size * viewport.z}px`,
        fontFamily: "'Alpino', system-ui, -apple-system, sans-serif",
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

- [ ] **Step 2: Update `frontend/src/components/overlay/UIOverlay.tsx`**

Read the current file first, then replace entirely:

```typescript
import { useCanvasStore } from '@/store/canvasStore'
import { NodeEditor } from './NodeEditor'

export function UIOverlay() {
  const editingNodeId = useCanvasStore((s) => s.editingNodeId)
  const nodes = useCanvasStore((s) => s.nodes)
  const viewport = useCanvasStore((s) => s.viewport)
  const setEditingNodeId = useCanvasStore((s) => s.setEditingNodeId)

  const editingNode = editingNodeId ? nodes[editingNodeId] : null

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {editingNode && (
        <div style={{ pointerEvents: 'all' }}>
          <NodeEditor
            node={editingNode}
            viewport={viewport}
            onClose={() => setEditingNodeId(null)}
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run tests**

```bash
cd /c/Users/parth/code_master/canvas/frontend && npm test 2>&1 | tail -8
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/parth/code_master/canvas && git add frontend/src/components/overlay/NodeEditor.tsx frontend/src/components/overlay/UIOverlay.tsx && git commit -m "feat: NodeEditor local state, bullet points, font size shortcut, save on close"
```

---

## Task 6: NoteCard — use node.font_size

**Files:**
- Modify: `frontend/src/components/canvas/NoteCard.tsx`

- [ ] **Step 1: Remove the `FONT_SIZE` constant and use `node.font_size`**

Read the current `frontend/src/components/canvas/NoteCard.tsx`. Find the line:

```typescript
const FONT_SIZE = 13
```

Delete that line. Then find the Konva `<Text>` component's `fontSize` prop:

```typescript
        fontSize={FONT_SIZE}
```

Replace it with:

```typescript
        fontSize={node.font_size}
```

- [ ] **Step 2: Run tests**

```bash
cd /c/Users/parth/code_master/canvas/frontend && npm test -- --reporter=verbose 2>&1 | tail -15
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/parth/code_master/canvas && git add frontend/src/components/canvas/NoteCard.tsx && git commit -m "feat: NoteCard uses per-node font_size"
```
