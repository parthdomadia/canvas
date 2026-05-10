# Phase 5: UI Polish + Themes — Design

## Goal

Remove the undo/redo toolbar to keep the canvas distraction-free. Add three selectable color themes (dark, light, matrix) switchable via `Ctrl+Shift+T`, persisted across sessions.

## Architecture

### Theme store field

`theme: 'dark' | 'light' | 'matrix'` is added to the Zustand `CanvasState`. It is already excluded from temporal undo history because `partialize` only tracks `nodes` and `edges`. A `setTheme` action sets the value and writes it to `localStorage`.

On store init, the theme is read from `localStorage` (default: `'dark'`).

### Theme definitions

`frontend/src/styles/themes.ts` exports a `THEMES` constant and a `Theme` type:

```ts
export type ThemeName = 'dark' | 'light' | 'matrix'

export interface Theme {
  canvasBg: string
  nodeBg: string
  nodeBorder: string
  nodeText: string
  accent: string        // selected border, edge accent
  shadow: string        // rgba shadow color
}

export const THEMES: Record<ThemeName, Theme> = {
  dark: {
    canvasBg: '#0d0d0d',
    nodeBg: '#1a1a2e',
    nodeBorder: '#2a2a3a',
    nodeText: '#e2e8f0',
    accent: '#7c3aed',
    shadow: 'rgba(0,0,0,0.35)',
  },
  light: {
    canvasBg: '#f0f0f0',
    nodeBg: '#ffffff',
    nodeBorder: '#d1d5db',
    nodeText: '#1a1a2e',
    accent: '#7c3aed',
    shadow: 'rgba(0,0,0,0.12)',
  },
  matrix: {
    canvasBg: '#000000',
    nodeBg: '#0a1a0a',
    nodeBorder: '#1a3a1a',
    nodeText: '#00ff41',
    accent: '#00ff41',
    shadow: 'rgba(0,255,65,0.2)',
  },
}
```

Semantic highlight colors (teal `#14B8A6` for directed reachability, gold `#F5C518` for simple neighbors) are not theme-specific — they remain constant across all themes.

### useTheme hook

`frontend/src/hooks/useTheme.ts` — subscribes to `theme` in the store, applies CSS variables to `:root` on each change, and returns the active `Theme` object for Konva components. Called once in `CanvasPage.tsx` (top-level, so CSS vars are always in sync).

CSS variables updated:
- `--canvas-bg`
- `--node-bg`
- `--node-border`
- `--node-text`
- `--accent`

### Keyboard shortcut

`Ctrl+Shift+T` (or `Cmd+Shift+T`) cycles `dark → light → matrix → dark`. Added to `useKeyboardShortcuts.ts`. Does not trigger while a node is being edited.

### Components updated for theming

| Component | What changes |
|---|---|
| `NoteCard.tsx` | Reads `theme` from store; uses `theme.nodeBg`, `theme.nodeBorder`, `theme.nodeText`, `theme.accent`, `theme.shadow` for Konva props |
| `EdgeLine.tsx` | Reads `theme.accent` for directed/simple edge stroke (replacing hardcoded purple) |
| `ConnectionHandle.tsx` | Reads `theme.accent` for handle fill/stroke |
| `CanvasStage.tsx` | Background already reads `--canvas-bg` CSS var — no Konva changes needed |
| `NodeEditor.tsx` | Already reads CSS vars `--node-bg`, `--node-text`, `--node-border-selected` — no changes needed |

### Removals

- `frontend/src/components/ui/Toolbar.tsx` — deleted entirely
- `frontend/src/pages/CanvasPage.tsx` — remove `<Toolbar />` JSX and its import

### Persistence

`localStorage` key: `canvas_theme`. Read once at store initialisation. Written on every `setTheme` call.

## File map

| File | Change |
|---|---|
| `frontend/src/styles/themes.ts` | Create — theme definitions |
| `frontend/src/store/canvasStore.ts` | Add `theme`, `setTheme`; read from localStorage on init |
| `frontend/src/hooks/useTheme.ts` | Create — applies CSS vars, returns active theme |
| `frontend/src/hooks/useKeyboardShortcuts.ts` | Add `Ctrl+Shift+T` cycle |
| `frontend/src/components/canvas/NoteCard.tsx` | Consume theme colors for Konva props |
| `frontend/src/components/canvas/EdgeLine.tsx` | Consume `theme.accent` |
| `frontend/src/components/canvas/ConnectionHandle.tsx` | Consume `theme.accent` |
| `frontend/src/pages/CanvasPage.tsx` | Remove Toolbar import + JSX |
| `frontend/src/components/ui/Toolbar.tsx` | Delete |
