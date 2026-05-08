# Canvas App — Phase 4: Undo/Redo + Selection

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full Ctrl+Z / Ctrl+Y undo-redo for all canvas actions, rubber-band multi-select by dragging on empty canvas, and multi-node drag using the batch position API.

**Depends on:** Phase 3 complete

---

## Task 1: Integrate zundo into canvasStore

- [ ] Install `zundo` (already in `frontend/package.json` — run `npm install` if not done)
- [ ] Wrap `canvasStore` with `temporal` middleware from zundo
- [ ] Configure zundo to track diffs on `nodes` and `edges` only — exclude `viewport`, `selectedIds`, `toolMode`, `connectingFrom`, `editingNodeId` from history
- [ ] Expose `undo` and `redo` functions via the temporal store: `useCanvasStore.temporal.getState().undo()`
- [ ] Write store tests verifying undo reverses an `addNode` and redo re-applies it

---

## Task 2: Keyboard shortcuts for undo/redo

- [ ] Update `useKeyboardShortcuts.ts`:
  - `Ctrl+Z` → call `undo()`
  - `Ctrl+Y` or `Ctrl+Shift+Z` → call `redo()`
  - Guard: don't fire while `editingNodeId` is set (user is typing)

---

## Task 3: Toolbar undo/redo buttons

- [ ] Create `frontend/src/components/ui/Toolbar.tsx` (minimal for now — expanded in Phase 5)
  - Undo button: disabled when history is empty
  - Redo button: disabled when future stack is empty
  - Read `canUndo` / `canRedo` from `useCanvasStore.temporal`
- [ ] Add `Toolbar` to `CanvasPage.tsx` (positioned top-left, absolute over canvas)

---

## Task 4: Rubber-band selection

- [ ] Create `frontend/src/components/canvas/SelectionBox.tsx`
  - Konva `Rect` with dashed stroke, no fill (or very low opacity fill)
  - Rendered in `NodeLayer` while drag-selecting
- [ ] Add drag-select logic to `CanvasStage.tsx`:
  - Pointer-down on empty stage + drag → track start point and current point in local state
  - Render `SelectionBox` between start and current pointer
  - Pointer-up → compute which nodes intersect the selection rect (canvas-space), call `setSelectedIds`
  - Distinguish between pan-drag and select-drag: pan uses middle-mouse or Space+drag; left-drag on empty canvas = select

---

## Task 5: Multi-select drag

- [ ] Update `NodeLayer` / `NoteCard` drag logic:
  - When dragging a node that is part of a multi-selection, move all selected nodes by the same delta
  - On drag-end with multiple selected nodes, call `batchUpdateNodePositions` API instead of individual `updateNode` calls
- [ ] Ensure undo/redo treats a multi-drag as a single history entry (zundo batches synchronous state changes automatically)

---

## Task 6: Smoke test

- [ ] Manually verify in Electron window:
  - [ ] Create two nodes, move one → Ctrl+Z moves it back, Ctrl+Y moves it forward
  - [ ] Create a node → Ctrl+Z removes it, Ctrl+Y restores it
  - [ ] Delete a node → Ctrl+Z restores it
  - [ ] Drag on empty canvas → rubber-band box appears, releasing selects intersecting nodes
  - [ ] Drag multiple selected nodes → all move together
  - [ ] Undo/Redo toolbar buttons reflect correct disabled state
- [ ] Run all tests — pass
- [ ] Commit: `feat: Phase 4 complete — undo/redo with zundo, rubber-band selection, multi-drag`
