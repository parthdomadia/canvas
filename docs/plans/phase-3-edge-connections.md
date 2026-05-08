# Canvas App — Phase 3: Edge Connections

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Users can draw connections between notes by dragging from a node's handle to another node. Edges are rendered as arrows, persisted to the DB, and can be selected and deleted.

**Depends on:** Phase 2 complete

---

## Task 1: Backend edge router + tests

- [ ] Create `backend/app/schemas/edge.py` (already stubbed — verify it's complete)
- [ ] Create `backend/app/routers/edges.py` with endpoints:
  - `POST /canvases/{id}/edges` — create edge (validate source/target exist, no self-loops)
  - `PATCH /edges/{id}` — update label/style
  - `DELETE /edges/{id}` — delete edge
- [ ] Register edges router in `app/main.py`
- [ ] Write `backend/tests/test_edges.py` covering create, create-with-self-loop (expect 422), delete, cascade-delete-when-node-deleted
- [ ] Run `pytest -v` — all tests pass

---

## Task 2: Frontend edge API + store actions

- [ ] Create `frontend/src/api/edges.ts` with `createEdge`, `deleteEdge`, `updateEdge`
- [ ] Verify `canvasStore` already has `addEdge` / `deleteEdge` actions (added in Phase 2) — nothing to add

---

## Task 3: EdgeLine component

- [ ] Create `frontend/src/components/canvas/EdgeLine.tsx`
  - Renders a Konva `Arrow` between the center of `source` node and center of `target` node
  - Accepts `edge`, `sourceNode`, `targetNode`, `isSelected` props
  - Selected state: thicker stroke + accent color
  - Click handler to select the edge
  - Use `memo` to avoid unnecessary redraws

---

## Task 4: EdgeLayer component

- [ ] Create `frontend/src/components/canvas/EdgeLayer.tsx`
  - Renders a Konva `Layer` below `NodeLayer`
  - Reads `edges` and `nodes` from Zustand
  - Skips edges where source or target node is missing
  - Handles edge click → `setSelectedIds`
- [ ] Add `EdgeLayer` to `CanvasStage.tsx` below `NodeLayer`

---

## Task 5: ConnectionHandle component

- [ ] Create `frontend/src/components/canvas/ConnectionHandle.tsx`
  - Small circle rendered at the right-center of a node
  - Only visible when node is hovered or selected
  - Accepts `nodeId`, `x`, `y` (canvas-space anchor point), `onStartConnect` prop

---

## Task 6: Edge drawing interaction

- [ ] Add `connectingFrom` logic to `NodeLayer`:
  - When `toolMode === 'connect'` or handle is dragged: set `connectingFrom` in store
  - While connecting: render a `Line` from source node center to current pointer position (live preview)
  - On pointer-up over a different node: call `createEdge`, `addEdge` to store, clear `connectingFrom`
  - On pointer-up over empty canvas: cancel connection, clear `connectingFrom`
- [ ] Show `ConnectionHandle` on each `NoteCard` when hovered

---

## Task 7: Edge keyboard delete

- [ ] Update `useKeyboardShortcuts.ts`:
  - Delete key also deletes selected edges (same pattern as node delete — optimistic store update, then API call)

---

## Task 8: Smoke test

- [ ] Manually verify in Electron window:
  - [ ] Hover a node → connection handle appears
  - [ ] Drag from handle to another node → edge arrow renders
  - [ ] Click edge → edge shows selected state
  - [ ] Delete key on selected edge → edge removed
  - [ ] Restart app → edges reload from DB
  - [ ] Deleting a node → its connected edges disappear
- [ ] Run `pytest -v` — all backend tests pass
- [ ] Commit: `feat: Phase 3 complete — edge connections with live preview and persistence`
