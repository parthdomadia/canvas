# Canvas App — Claude Preferences & Project Context

## Project Overview

A visual knowledge-mapping desktop app (Electron + React + Konva + FastAPI + Supabase). Users create and connect text nodes on an infinite canvas. Single-user MVP.

**Tech stack:** Electron · React 18 + TypeScript (Vite) · Konva.js · Zustand + zundo · FastAPI · Supabase (Postgres)

**Phases:**
1. Project skeleton ✅
2. Node CRUD ✅
3. Edge connections ✅
4. Undo/redo + selection (next)
5. UI polish + themes
6. Electron packaging

Specs live in `docs/superpowers/specs/`. Plans live in `docs/superpowers/plans/`.

---

## Working Preferences

### Responses
- Keep responses short and direct — no trailing summaries, no restating what was just done
- Lead with the answer or action, not the reasoning
- Skip filler words and preamble

### Workflow
- Always brainstorm before implementation (use `superpowers:brainstorming` skill)
- Write a spec doc and get approval before writing a plan
- Write an implementation plan before touching code
- Use **subagent-driven approach** for execution (not inline)
- Commit after each logical task

### Visuals
- No visual companion / browser mockups — text-only brainstorming is fine

### Implementation style
- Prefer Konva built-ins over custom implementations (e.g., use `Transformer` for resize, not custom handles)
- Prefer live/interactive behavior (e.g., live resize over commit-on-release)
- Follow existing code patterns — don't restructure unless it serves the task
- No speculative abstractions, no extra error handling for impossible cases
- No docstrings or comments on unchanged code

### Canvas-specific patterns
- Imperative Konva updates (via refs) for performance-critical paths (drag, cluster move) — bypass React during gesture, commit to store on mouseup
- Per-component Zustand subscriptions (`s.nodes[nodeId]`) to minimize re-renders
- Stable selectors + `useMemo` for derived arrays to keep `memo()` intact
- `nodeGroupRefs` Map (from NoteCard) for imperative Group access
- `edgeUpdateFns` Map (from EdgeLine) for imperative edge point updates

---

## Key Files

| File | Purpose |
|---|---|
| `frontend/src/components/canvas/CanvasStage.tsx` | Stage setup, zoom/pan, node creation gesture |
| `frontend/src/components/canvas/NodeLayer.tsx` | Node rendering, selection, edge drawing, cluster drag |
| `frontend/src/components/canvas/NoteCard.tsx` | Single node card, connection handles |
| `frontend/src/components/canvas/EdgeLayer.tsx` | Edge rendering |
| `frontend/src/components/canvas/EdgeLine.tsx` | Single edge line (simple/directed) |
| `frontend/src/store/canvasStore.ts` | Zustand store — nodes, edges, viewport, selection |
| `frontend/src/api/nodes.ts` | Node CRUD API calls |
| `frontend/src/api/edges.ts` | Edge CRUD API calls |
| `backend/app/routers/nodes.py` | FastAPI node endpoints |
| `backend/app/routers/edges.py` | FastAPI edge endpoints |
| `backend/app/schemas/node.py` | Pydantic node schemas |
| `backend/app/schemas/edge.py` | Pydantic edge schemas |
