# Node Dimension Control — Design Spec

**Date:** 2026-05-08  
**Status:** Approved

---

## Goal

Allow users to control node dimensions both at creation time (double-click + drag to draw) and post-creation (Konva Transformer resize handles on selected node).

---

## Creation Gesture

### Interaction

Replace the existing `onDblClick` handler on `CanvasStage` with a `mousedown`-based double-click detector.

**Sequence:**
1. First `mousedown` on empty stage → record timestamp and position
2. Second `mousedown` within 300ms on empty stage → enter draw mode; record canvas-space start point; set `draggable={false}` on Stage to prevent panning
3. `mousemove` while drawing → update `ghostRect` state `{ x, y, w, h }` in canvas space; clamp to minimum 80×60
4. `mouseup` → if drag distance > 10px, create node at drawn dimensions; otherwise create at default 200×120. End draw mode, restore `draggable={true}`.

**Fallback:** A pure double-click (no drag, or drag < 10px) creates a node at 200×120 centered on the click point — identical to current behavior.

### Ghost Rect

Rendered as a dedicated `<Layer listening={false}>` inside `<Stage>`, below EdgeLayer and NodeLayer. Styled with:
- Dashed purple stroke (`#7c3aed`, strokeWidth 1.5, dash [6, 4])
- Very faint fill (`rgba(124, 58, 237, 0.05)`)

Matches the visual language of the edge preview line.

### Stage changes (`CanvasStage.tsx`)

- Remove `onDblClick` handler
- Add `onMouseDown` handler: detect 2nd rapid click, transition to draw mode
- Add `onMouseMove` handler: update `ghostRect` during draw mode
- Add `onMouseUp` handler: finalize node creation, exit draw mode
- Add `ghostRect` state: `{ x: number; y: number; w: number; h: number } | null`
- Add `isDrawing` state: `boolean`
- Bind `draggable={!isDrawing}` on Stage

### Node creation

Call `createNode(canvasId, x, y, width, height)` with the drawn dimensions. The `createNode` API function already accepts position; verify the backend `POST /nodes` accepts optional `width`/`height` or uses defaults — update if needed.

---

## Post-Creation Resize

### Interaction

When exactly one node is selected, Konva `<Transformer>` anchors appear around it. The user drags any anchor to resize live.

### Transformer config

- `rotateEnabled: false`
- `keepRatio: false` (independent width/height)
- `boundBoxFunc`: enforce minimum 80×60
- All 8 anchors enabled (corners + edge midpoints)

### Attachment

A single `<Transformer ref={transformerRef}>` is rendered inside `NodeLayer`. A `useEffect` watches `selectedIds`:
- If exactly 1 node selected → `transformerRef.current.nodes([nodeGroupRefs.get(id)])`
- Otherwise → `transformerRef.current.nodes([])`
- Call `transformerRef.current.getLayer()?.batchDraw()` after each change

### Live resize (`onTransform`)

Fired continuously during drag. Handler on the Transformer:

```
const group = nodeGroupRefs.get(selectedId)
const newW = Math.round(group.width() * group.scaleX())
const newH = Math.round(group.height() * group.scaleY())
group.scaleX(1)
group.scaleY(1)
updateNode(selectedId, { width: newW, height: newH })
```

Resetting scale to 1 and updating `width`/`height` in the store causes NoteCard to re-render with new dimensions. The Rect, Text, and all four ConnectionHandles reflow automatically because they read `node.width/height` from store.

### Persist on release (`onTransformEnd`)

Same computation as `onTransform`, then call `updateNodeApi(canvasId, id, { width, height })` to persist to backend.

---

## Constraints

| Constraint | Value |
|---|---|
| Minimum node width | 80px |
| Minimum node height | 60px |
| Default node size (click only) | 200×120px |
| Draw mode drag threshold | 10px |
| Double-click detection window | 300ms |

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/components/canvas/CanvasStage.tsx` | Replace dblclick with mousedown draw gesture; ghost rect layer |
| `frontend/src/components/canvas/NodeLayer.tsx` | Add single Transformer; attach to selected node; onTransform + onTransformEnd handlers |
| `frontend/src/api/nodes.ts` | Verify/update `createNode` to accept optional width/height |
| `backend/app/routers/nodes.py` | Verify POST accepts width/height (likely already stored) |
| `backend/app/schemas/node.py` | Verify NodeCreate schema has width/height with defaults |

---

## Out of Scope

- Multi-node resize (Transformer only attaches when exactly 1 node is selected)
- Aspect-ratio-locked resize
- Resize undo/redo (covered in Phase 4 via zundo)
