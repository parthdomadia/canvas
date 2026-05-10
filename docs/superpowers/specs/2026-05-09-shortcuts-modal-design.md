# Shortcuts Modal — Design

## Goal

Add a discoverable entry point for all keyboard shortcuts: a floating pill button in the top-left corner that opens a polished in-app modal listing every shortcut grouped by category.

## Architecture

### State

Local `useState<boolean>` inside `ShortcutsModal`. No Zustand store changes. The modal manages its own open/closed state.

### Files

| File | Change |
|---|---|
| `frontend/src/components/overlay/ShortcutsModal.tsx` | New — pill button + modal component |
| `frontend/src/components/overlay/UIOverlay.tsx` | Add `<ShortcutsModal />` |
| `frontend/src/styles/globals.css` | Add `@keyframes` for modal fade+scale animation |

### Component structure

`ShortcutsModal` renders two things unconditionally:
1. The pill trigger button (always visible, `pointerEvents: all`)
2. The modal overlay (rendered only when `open === true`)

Escape to close is handled by a `useEffect` `keydown` listener inside `ShortcutsModal` — active only when the modal is open. It calls `e.stopPropagation()` so the global shortcut handler does not also fire (e.g. deselect).

Clicking the backdrop closes the modal. Clicking inside the modal card stops propagation.

## Trigger Button

- Position: `position: fixed`, `top: 16px`, `left: 16px`, `zIndex: 50`
- Label: `⌨ Shortcuts`
- Style: pill shape, `padding: 8px 14px`, `border-radius: 999px`
- Colors: `background: rgba(255,255,255,0.07)`, `border: 1px solid rgba(255,255,255,0.12)`, `color: var(--node-text)`
- Font: Alpino, `12px`
- Hover: `background: rgba(255,255,255,0.12)` (transition `150ms`)
- On light theme the semi-transparent whites work correctly because `--node-text` is dark and the canvas bg is light — no extra theme branching needed

## Modal

### Backdrop
- `position: fixed`, `inset: 0`, `zIndex: 100`
- `background: rgba(0,0,0,0.55)`, `backdropFilter: blur(4px)`
- Click → close

### Card
- Centered via flexbox on backdrop
- Width: `480px`, `maxHeight: 75vh`, `overflowY: auto`
- `background: var(--node-bg)`, `border: 1px solid rgba(255,255,255,0.1)`, `borderRadius: 12px`, `padding: 24px`
- Header: "Keyboard Shortcuts" (`16px`, semibold) + `×` close button (right-aligned, `--node-text-secondary`)
- Click inside card stops propagation (does not close)

### Animation
CSS class `shortcuts-modal-enter` applied to the card:
```css
@keyframes shortcuts-modal-in {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}
.shortcuts-modal-enter {
  animation: shortcuts-modal-in 180ms ease-out forwards;
}
```

### Shortcut groups

Groups rendered in order, each with a small-caps section label and shortcut rows below.

**Canvas**
| Keys | Action |
|---|---|
| `Double-click` | Create node |
| `Right-click drag` | Move node cluster |

**Selection & Actions**
| Keys | Action |
|---|---|
| `Click` | Select node or edge |
| `Ctrl` `Click` | Multi-select |
| `Delete` / `Backspace` | Delete selected |
| `Escape` | Deselect all |

**History**
| Keys | Action |
|---|---|
| `Ctrl` `Z` | Undo |
| `Ctrl` `Y` / `Ctrl` `Shift` `Z` | Redo |

**Node Editing** *(active while editing a node)*
| Keys | Action |
|---|---|
| `Escape` | Save and close |
| `Enter` | New line |
| `- Space` | Convert to bullet `•` |
| `Ctrl` `Shift` `<` | Decrease font size |
| `Ctrl` `Shift` `>` | Increase font size |

**Appearance**
| Keys | Action |
|---|---|
| `Ctrl` `Shift` `T` | Cycle theme |

### Keycap styling

`<kbd>` elements:
- `background: rgba(255,255,255,0.08)`
- `border: 1px solid rgba(255,255,255,0.18)`
- `border-bottom: 2px solid rgba(255,255,255,0.18)` (3D effect)
- `border-radius: 5px`
- `padding: 2px 7px`
- `font-size: 11px`, monospace
- `color: var(--node-text)`

Multiple keys in a combo are separated by a `+` text node. Alternatives (e.g. `Ctrl Y` / `Ctrl Shift Z`) are separated by a `/` text node.

Each shortcut row is a flex row: description left (`flex: 1`, `--node-text`), keys right-aligned (`display: flex`, `gap: 4px`, `align-items: center`).

## Accessibility

- Backdrop and `×` button have `aria-label`
- Modal card has `role="dialog"` and `aria-modal="true"`
- `×` button is a `<button>` element (keyboard-focusable)
- Escape closes the modal (via `useEffect` keydown listener)
