# Node Dimension Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users set node dimensions at creation time by double-click-dragging a ghost rect, and resize existing nodes by dragging Konva Transformer anchors.

**Architecture:** The creation gesture lives entirely in `CanvasStage` (mousedown tracking → ghost rect → `createNode`). Post-creation resize is a single `<Transformer>` in `NodeLayer` that attaches imperatively to the selected node's Konva Group via the existing `nodeGroupRefs` map; live updates flow through `updateNode` in the store, persist via the existing `updateNode` API on `transformEnd`.

**Tech Stack:** React, Konva / react-konva, Zustand, existing FastAPI backend (already accepts `width`/`height` on node create — no backend changes needed).

---

## File Map

| File | Change |
|---|---|
| `frontend/src/api/nodes.ts` | Add optional `width`/`height` params to `createNode` |
| `frontend/src/components/canvas/CanvasStage.tsx` | Replace `onDblClick` with mousedown draw gesture; add ghost rect Layer |
| `frontend/src/components/canvas/NodeLayer.tsx` | Add single `<Transformer>`; wire `onTransform` + `onTransformEnd` |

---

## Task 1: Extend `createNode` API to accept dimensions

**Files:**
- Modify: `frontend/src/api/nodes.ts`

- [ ] **Step 1: Update `createNode` signature and body**

Replace the current `createNode` function with:

```typescript
export async function createNode(
  canvasId: string,
  x: number,
  y: number,
  width?: number,
  height?: number,
): Promise<CanvasNode> {
  const body: Record<string, unknown> = { x, y }
  if (width !== undefined) body.width = width
  if (height !== undefined) body.height = height
  const res = await apiClient.post<CanvasNode>(`/canvases/${canvasId}/nodes`, body)
  return res.data
}
```

- [ ] **Step 2: Verify existing call sites still compile**

The only call site is `CanvasStage.tsx` line ~98: `createNode(canvasId, x, y)` — the new signature is backwards-compatible (width/height are optional), so no change needed there yet.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/nodes.ts
git commit -m "feat: extend createNode API to accept optional width/height"
```

---

## Task 2: Draw-to-create gesture in CanvasStage

**Files:**
- Modify: `frontend/src/components/canvas/CanvasStage.tsx`

### Context

Current flow: `onDblClick` on empty Stage → `createNode(canvasId, x - 100, y - 60)` at fixed 200×120.

New flow: track mousedown count + timing; on 2nd rapid mousedown enter draw mode; mousemove draws ghost rect; mouseup creates node at drawn size (or default if drag < 10px).

- [ ] **Step 1: Add draw state and refs**

Add these inside `CanvasStage`, before the handlers:

```typescript
const [isDrawing, setIsDrawing] = useState(false)
const [ghostRect, setGhostRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
const lastClickTime = useRef<number>(0)
const drawStart = useRef<{ x: number; y: number } | null>(null)
```

- [ ] **Step 2: Add canvas-coordinate helper**

Add this helper inside `CanvasStage` (after the existing refs). It reads the current pointer position from the Konva stage and converts it from screen space to canvas space using the current viewport:

```typescript
const toCanvasCoords = useCallback(() => {
  const stage = stageRef.current
  if (!stage) return { x: 0, y: 0 }
  const pos = stage.getPointerPosition()
  if (!pos) return { x: 0, y: 0 }
  const scale = stage.scaleX()
  const stagePos = stage.position()
  return {
    x: (pos.x - stagePos.x) / scale,
    y: (pos.y - stagePos.y) / scale,
  }
}, [])
```

- [ ] **Step 3: Add `handleStageMouseDown`**

Add this handler:

```typescript
const handleStageMouseDown = useCallback(
  (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target !== stageRef.current) return
    if (e.evt.button !== 0) return

    const now = Date.now()
    if (now - lastClickTime.current < 300) {
      // Second click within threshold — enter draw mode
      const canvasPos = toCanvasCoords()
      drawStart.current = canvasPos
      setIsDrawing(true)
      setGhostRect({ x: canvasPos.x, y: canvasPos.y, w: 0, h: 0 })
      lastClickTime.current = 0
    } else {
      lastClickTime.current = now
    }
  },
  [toCanvasCoords],
)
```

- [ ] **Step 4: Add `handleStageMouseMove`**

```typescript
const handleStageMouseMove = useCallback(
  (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || !drawStart.current) return
    const canvasPos = toCanvasCoords()
    const rawW = canvasPos.x - drawStart.current.x
    const rawH = canvasPos.y - drawStart.current.y
    setGhostRect({
      x: rawW >= 0 ? drawStart.current.x : canvasPos.x,
      y: rawH >= 0 ? drawStart.current.y : canvasPos.y,
      w: Math.max(Math.abs(rawW), 80),
      h: Math.max(Math.abs(rawH), 60),
    })
  },
  [isDrawing, toCanvasCoords],
)
```

- [ ] **Step 5: Add `handleStageMouseUp`**

```typescript
const handleStageMouseUp = useCallback(
  async (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || !drawStart.current) return
    if (e.evt.button !== 0) return

    const rect = ghostRect
    setIsDrawing(false)
    setGhostRect(null)
    drawStart.current = null

    if (!canvasId || !rect) return

    const dragDistance = Math.sqrt(rect.w ** 2 + rect.h ** 2)
    const useDrawn = dragDistance > 10

    const x = useDrawn ? rect.x : (rect.x - 100)
    const y = useDrawn ? rect.y : (rect.y - 60)
    const width = useDrawn ? rect.w : undefined
    const height = useDrawn ? rect.h : undefined

    const node = await createNode(canvasId, x, y, width, height)
    addNode(node)
    setEditingNodeId(node.id)
  },
  [isDrawing, ghostRect, canvasId, addNode, setEditingNodeId],
)
```

- [ ] **Step 6: Remove `handleStageDblClick`, wire new handlers onto Stage**

Remove the `handleStageDblClick` function entirely. Update the `<Stage>` JSX:

```tsx
<Stage
  ref={stageRef}
  width={size.width}
  height={size.height}
  draggable={!isDrawing}
  onWheel={handleWheel}
  onDragEnd={handleDragEnd}
  onClick={handleStageClick}
  onMouseDown={handleStageMouseDown}
  onMouseMove={handleStageMouseMove}
  onMouseUp={handleStageMouseUp}
  style={{ background: 'var(--canvas-bg)' }}
>
  <EdgeLayer />
  <NodeLayer />
  {ghostRect && (
    <Layer listening={false}>
      <Rect
        x={ghostRect.x}
        y={ghostRect.y}
        width={ghostRect.w}
        height={ghostRect.h}
        stroke="#7c3aed"
        strokeWidth={1.5}
        dash={[6, 4]}
        fill="rgba(124, 58, 237, 0.05)"
        listening={false}
      />
    </Layer>
  )}
</Stage>
```

Add `Rect` to the react-konva import at the top:

```typescript
import { Stage, Layer, Rect } from 'react-konva'
```

- [ ] **Step 7: Manual smoke test**

Start the app. Verify:
- Double-click without dragging → node appears at 200×120 ✓
- Double-click and drag → purple ghost rect follows cursor → release → node created at drawn size ✓
- Stage panning still works (drag on empty canvas without double-clicking) ✓

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/canvas/CanvasStage.tsx
git commit -m "feat: draw-to-create node gesture with ghost rect"
```

---

## Task 3: Post-creation resize with Konva Transformer

**Files:**
- Modify: `frontend/src/components/canvas/NodeLayer.tsx`

### Context

`nodeGroupRefs` is a `Map<string, Konva.Group>` exported from `NoteCard.tsx`. The Transformer attaches to the Konva Group of the selected node. On `onTransform` (live), we read the Group's current scale, compute new pixel dimensions, reset scale to 1, and call `updateNode` in the store — NoteCard re-renders with new `node.width/height`, reflowing Rect, Text, and ConnectionHandles. On `onTransformEnd`, we also call the API.

- [ ] **Step 1: Add Transformer ref and import**

At the top of `NodeLayer.tsx`, add to the react-konva import:

```typescript
import { Layer, Line, Transformer } from 'react-konva'
```

Add `Konva` is already imported. Also add `updateNode as updateNodeApi` to the api import:

```typescript
import { createEdge } from '@/api/edges'
import { updateNode as updateNodeApi } from '@/api/nodes'
```

Inside `NodeLayer`, add:

```typescript
const transformerRef = useRef<Konva.Transformer>(null)
const canvasId = useCanvasStore((s) => s.canvasId)
```

- [ ] **Step 2: Attach Transformer to selected node via effect**

Add this `useEffect` inside `NodeLayer`, after the existing refs:

```typescript
useEffect(() => {
  const tr = transformerRef.current
  if (!tr) return

  const selectedArr = [...selectedIds].filter((id) => !!nodesById[id])
  if (selectedArr.length === 1) {
    const group = nodeGroupRefs.get(selectedArr[0])
    tr.nodes(group ? [group] : [])
  } else {
    tr.nodes([])
  }
  tr.getLayer()?.batchDraw()
}, [selectedIds, nodesById])
```

- [ ] **Step 3: Add `handleTransform` (live resize)**

```typescript
const handleTransform = useCallback(() => {
  const selectedArr = [...useCanvasStore.getState().selectedIds]
  if (selectedArr.length !== 1) return
  const id = selectedArr[0]
  const group = nodeGroupRefs.get(id)
  if (!group) return

  const node = useCanvasStore.getState().nodes[id]
  if (!node) return

  const newW = Math.max(80, Math.round(node.width * group.scaleX()))
  const newH = Math.max(60, Math.round(node.height * group.scaleY()))
  group.scaleX(1)
  group.scaleY(1)

  updateNode(id, { width: newW, height: newH })
}, [updateNode])
```

- [ ] **Step 4: Add `handleTransformEnd` (persist)**

```typescript
const handleTransformEnd = useCallback(() => {
  const selectedArr = [...useCanvasStore.getState().selectedIds]
  if (selectedArr.length !== 1) return
  const id = selectedArr[0]
  const node = useCanvasStore.getState().nodes[id]
  if (!node) return

  updateNodeApi(id, { width: node.width, height: node.height }).catch(console.error)
}, [])
```

- [ ] **Step 5: Render Transformer in Layer JSX**

Inside the `return` of `NodeLayer`, add `<Transformer>` after the `{nodeIds.map(...)}` block and before the closing `</Layer>`:

```tsx
<Transformer
  ref={transformerRef}
  rotateEnabled={false}
  keepRatio={false}
  boundBoxFunc={(oldBox, newBox) => ({
    ...newBox,
    width: Math.max(80, newBox.width),
    height: Math.max(60, newBox.height),
  })}
  onTransform={handleTransform}
  onTransformEnd={handleTransformEnd}
/>
```

- [ ] **Step 6: Manual smoke test**

Start the app. Verify:
- Select a node → 8 resize anchors appear around it ✓
- Drag a corner anchor → node resizes live, content reflows ✓
- Drag an edge-midpoint anchor → node resizes on one axis only ✓
- Release → dimensions persist after refresh ✓
- Select a different node → anchors move to new node ✓
- Click empty canvas (deselect) → anchors disappear ✓
- Connection handles still appear on hover/select at correct positions ✓
- Cluster drag (right-click drag) still works ✓

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/canvas/NodeLayer.tsx
git commit -m "feat: Konva Transformer for live node resize"
```

---

## Task 4: Final verification

- [ ] **Step 1: Full flow test**

  - [ ] Draw a large node (drag ~300×200) → correct dimensions in DB (check Network tab PATCH)
  - [ ] Draw a tiny drag (< 10px) → falls back to 200×120
  - [ ] Resize a node via Transformer → PATCH `/nodes/{id}` fires with new width/height on release
  - [ ] Refresh page → resized dimensions persist
  - [ ] Edge connections still route correctly from node centers after resize

- [ ] **Step 2: Commit recap**

```bash
git commit --allow-empty -m "feat: node dimension control complete — draw-to-create + transformer resize"
```
