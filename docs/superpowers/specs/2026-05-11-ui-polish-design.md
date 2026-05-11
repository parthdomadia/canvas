# UI Polish — Design

## Goal

Add three visual polish features to the canvas: a dot grid background, node animations (creation, deletion, selection), and an empty state hint. No backend changes required.

## File Map

| File | Change |
|---|---|
| `frontend/src/components/canvas/DotGrid.tsx` | New — Konva dot grid background |
| `frontend/src/components/overlay/EmptyState.tsx` | New — empty canvas hint overlay |
| `frontend/src/styles/themes.ts` | Add `dotGrid` color to Theme interface and all 3 themes |
| `frontend/src/components/canvas/CanvasStage.tsx` | Add DotGrid as background Layer |
| `frontend/src/components/canvas/NoteCard.tsx` | Mount animation, pending-delete animation, selection pulse |
| `frontend/src/store/canvasStore.ts` | Add `pendingDeleteIds: Set<string>`, `confirmDelete` action |
| `frontend/src/components/overlay/UIOverlay.tsx` | Render EmptyState |
| `frontend/src/styles/globals.css` | Add `@keyframes pulse-dot` |

---

## Section 1: Dot Grid

### Component: `DotGrid.tsx`

A single Konva `Rect` with `fillPatternImage` set to a small offscreen `<canvas>` that draws one dot centered in a transparent tile. The Rect is placed in a dedicated background `Layer` in `CanvasStage.tsx`, below NodeLayer and EdgeLayer.

The pattern's `fillPatternOffset` and `fillPatternScale` update reactively from the store's `viewport` (pan position + zoom scale) so the dots track canvas movement exactly — panning scrolls the dot field, zooming compresses or expands it.

**Dot spec:** 1.5px radius, 32px tile spacing (canvas units).

**Color:** Each theme gains a `dotGrid` string (a faint color derived from the theme's node border):

| Theme | `dotGrid` |
|---|---|
| dark | `#2a2a3a` (same as `nodeBorder`, low opacity dots implied by the color choice) |
| light | `#c0c4cc` |
| matrix | `#0d2e0d` |

### Integration

`CanvasStage.tsx` adds a `<Layer>` before the existing node/edge layers:

```tsx
<Layer listening={false}>
  <DotGrid />
</Layer>
```

`listening={false}` ensures the grid never intercepts mouse events.

---

## Section 2: Node Animations

### Creation — mount tween

In `NoteCard`, a `useEffect` runs once on mount. It reads the Group ref, sets initial values imperatively (opacity 0, scaleX 0.85, scaleY 0.85, offset to keep center fixed during scale), then runs a Konva tween to opacity 1, scaleX 1, scaleY 1 over 150ms with `Konva.Easings.EaseOut`.

The tween is destroyed in the effect cleanup.

### Deletion — pending-delete pattern

**Store changes:**

```ts
pendingDeleteIds: Set<string>   // new field, default: new Set()
confirmDelete: (ids: string[]) => void  // removes ids from nodes and pendingDeleteIds
```

The existing `deleteNodes` action changes: instead of immediately removing nodes from state, it adds their IDs to `pendingDeleteIds` (and still calls the API and removes edges as before).

**NoteCard changes:**

A `useEffect` watches `pendingDeleteIds` for the node's own ID. When found, it plays a Konva tween on the Group ref: opacity 1→0, scaleX/scaleY 1→0.85, 120ms EaseIn. On tween completion, it calls `confirmDelete([nodeId])`.

Edge deletion remains instant — `EdgeLine` unmounts immediately when removed from store, no tween needed.

### Selection — scale pulse

In `NoteCard`, a `useEffect` watching `isSelected` plays a scale pulse on the Group ref when `isSelected` goes `true`: scaleX/scaleY 1.0→1.04→1.0 over 180ms, `Konva.Easings.EaseInOut`. No animation when deselecting.

The pulse uses two chained tweens: first scale up (90ms), then scale back down (90ms).

---

## Section 3: Empty State

### Component: `EmptyState.tsx`

A React div (not Konva) centered on screen using `position: fixed; inset: 0; display: flex; align-items: center; justify-content: center`. Rendered in `UIOverlay.tsx` when `Object.keys(nodes).length === 0`.

Contents (stacked vertically, centered):
1. A pulsing circle — 12px diameter, `background: var(--accent)`, CSS animation `pulse-dot` 1.5s ease-in-out infinite alternate
2. Text — "Double-click anywhere to create a note", `color: var(--node-text-secondary)`, 14px, Alpino font

The component has `pointerEvents: none` so it never blocks canvas interactions.

### CSS animation

Added to `globals.css`:

```css
@keyframes pulse-dot {
  from { transform: scale(0.8); opacity: 1; }
  to   { transform: scale(1.3); opacity: 0.4; }
}
```

### Integration

`UIOverlay.tsx` reads `nodes` from the store and conditionally renders `<EmptyState />`:

```tsx
const nodes = useCanvasStore((s) => s.nodes)
// ...
{Object.keys(nodes).length === 0 && <EmptyState />}
```
