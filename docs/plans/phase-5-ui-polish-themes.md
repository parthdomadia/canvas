# Canvas App — Phase 5: UI Polish + Themes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** All three themes fully styled and switchable, complete toolbar, minimap, zoom controls, right-click context menu, and smooth animations on node create/delete.

**Depends on:** Phase 4 complete

---

## Task 1: Three complete themes

- [ ] Define all three theme token sets in `globals.css` as CSS class overrides on `[data-theme]`:
  - `dark-dense` — deep blacks (`#0d0d0d` canvas, `#1a1a2e` nodes, muted borders, no accent glow)
  - `light-clean` — white canvas (`#f0f0f0`), white node cards, subtle shadows, blue accent (`#18a0fb`)
  - `dark-accent` — near-black canvas (`#0f0f14`), dark nodes with purple border glow, vibrant purple accent (`#7c3aed`)
- [ ] Update every CSS var reference in `NoteCard`, `NodeEditor`, `UIOverlay` to use the token vars so themes apply automatically
- [ ] Apply `data-theme` attribute to `document.body` when theme changes

---

## Task 2: Theme store + ThemeSwitcher

- [ ] Create `frontend/src/store/themeStore.ts` — Zustand store with `persist` middleware (localStorage key: `canvas_theme`)
  - State: `theme: 'dark-dense' | 'light-clean' | 'dark-accent'`
  - Action: `setTheme(t)` — updates store and sets `document.body.dataset.theme`
- [ ] Create `frontend/src/components/ui/ThemeSwitcher.tsx`
  - Three clickable swatches/buttons showing theme previews
  - Highlights active theme
- [ ] On app boot in `App.tsx`, apply the stored theme to `document.body` before first render

---

## Task 3: Complete Toolbar

- [ ] Expand `Toolbar.tsx` to include:
  - App title / canvas title (editable inline — click to rename, calls `updateCanvasTitle` API)
  - Tool mode selector: Select / Connect / Pan icons (updates `toolMode` in store)
  - Undo / Redo buttons with disabled states (from Phase 4)
  - ThemeSwitcher component
  - Zoom percentage display (reads from `viewport.z`)
- [ ] Style toolbar as a floating pill or top bar — clean, minimal, non-intrusive
- [ ] Add to `CanvasPage`

---

## Task 4: ZoomControls

- [ ] Create `frontend/src/components/ui/ZoomControls.tsx`
  - `+` button — zoom in by one step, zooming toward canvas center
  - `−` button — zoom out by one step
  - `[ ]` fit-to-screen button — compute bounding box of all nodes, set viewport to fit them all with padding
  - Zoom percentage label
- [ ] Add to `CanvasPage` (bottom-right, absolute positioned)

---

## Task 5: MiniMap

- [ ] Create `frontend/src/components/ui/MiniMap.tsx`
  - HTML `<canvas>` element (not Konva) — 180×120px, bottom-right corner
  - Renders a dot per node, positioned proportionally to their canvas-space coordinates
  - Renders a viewport rectangle showing the current visible area
  - Click on minimap → pan the main canvas to that position
  - Redraws whenever `nodes` or `viewport` changes (use `useEffect`)
- [ ] Add to `CanvasPage`

---

## Task 6: Context menu

- [ ] Create `frontend/src/components/overlay/ContextMenu.tsx` using Radix UI `DropdownMenu`
  - Triggered by right-click on a node
  - Menu items: **Edit**, **Duplicate**, **Delete**, divider, **Color** submenu (default, red, blue, green, yellow)
  - Duplicate: create a new node at offset (+20, +20), copy content, persist to DB
  - Color: call `updateNode` with new color token, autosave picks it up
- [ ] Wire right-click handler in `NoteCard.tsx` → pass up via `onContextMenu` prop
- [ ] Show `ContextMenu` via `UIOverlay` at the right-click screen position

---

## Task 7: Node animations

- [ ] Node appear: use Konva `Tween` to animate `opacity` 0→1 and `scaleX/scaleY` 0.85→1 over 150ms when a node is first added
- [ ] Node delete: animate `opacity` 1→0 and scale 1→0.85 over 120ms, then remove from store after animation completes
  - Update `deleteNode` flow: trigger animation first, delete from store on animation end

---

## Task 8: Smoke test

- [ ] Manually verify in Electron window:
  - [ ] Switch between all 3 themes — canvas, nodes, toolbar all restyle instantly
  - [ ] Close and reopen app — last theme persists
  - [ ] Rename canvas title inline
  - [ ] Tool mode switching works (select / connect / pan)
  - [ ] Zoom controls (+/−/fit) work correctly
  - [ ] Minimap shows correct node positions, clicking pans canvas
  - [ ] Right-click node → context menu appears with all items
  - [ ] Duplicate node via context menu
  - [ ] Change node color via context menu
  - [ ] Node appear/delete animations play smoothly
- [ ] Commit: `feat: Phase 5 complete — 3 themes, toolbar, minimap, zoom controls, context menu, animations`
