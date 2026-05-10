# Node Editor Improvements — Design

## Goal

Three improvements to the node text editor: Enter inserts a newline instead of closing the editor, a markdown-lite bullet point system, and per-node font size adjusted via keyboard shortcut. Save strategy is reworked to make exactly one DB call per editing session instead of one per keystroke.

## Architecture

### Save strategy

`NodeEditor` holds a local `useState<string>` for content. The Zustand store is **not** updated while the user is typing. On exit (Escape or blur), the component flushes the final value: one `updateNode` store call + one direct `apiUpdateNode` call.

`useAutosave` is narrowed to exclude `content` from its change detection. It continues to watch `x`, `y`, `width`, `height`, `color` (position/size/color changes still autosave as before).

Result: zero DB calls while typing, exactly one on close.

### Exit behaviour

- **Escape** → save + close
- **Blur** (click outside) → save + close
- **Enter** → inserts newline (default textarea behaviour — the current `Enter && !shiftKey` exit handler is removed)

### Bullet points

Pure text transformation — bullets are stored as `• ` (Unicode bullet U+2022 + space) in the plain text content. No rich text or markup.

Rules implemented in `NodeEditor` `onKeyDown`:

| Key | Condition | Action |
|---|---|---|
| Space | Text from line start to cursor is exactly `-` | Prevent default; replace `-` with `• ` (line becomes `• `) |
| Enter | Current line starts with `• ` and has content after the prefix | Prevent default; insert `\n• ` at cursor |
| Enter | Current line is exactly `• ` (empty bullet) | Prevent default; remove `• `; no new line |
| Enter | Current line has no bullet prefix | Default textarea behaviour (insert newline) |

"Current line" is defined as the substring from the last `\n` before `selectionStart` to `selectionStart`.

### Per-node font size

`font_size: number` is added to `CanvasNode` with a default of `13`. It is stored in the database and returned with every node fetch.

**Shortcut:** `Ctrl+Shift+<` (decrease) and `Ctrl+Shift+>` (increase), detected inside `NodeEditor`'s `onKeyDown` as `e.key === '<'` and `e.key === '>'` with `e.ctrlKey && e.shiftKey`. Range: 8–48, step 1. Each press calls `updateNode({font_size})` + `apiUpdateNode` immediately (deliberate action, one call per press).

**Rendering:** `NoteCard` Konva `Text` uses `node.font_size`. `NodeEditor` textarea uses `node.font_size * viewport.z` (same scaling as before).

## File Map

| File | Change |
|---|---|
| `backend/app/schemas/node.py` | Add `font_size: int = 13` to request/response schemas |
| `backend/app/routers/nodes.py` | Include `font_size` in create/update logic |
| `frontend/src/types/index.ts` | Add `font_size: number` to `CanvasNode` |
| `frontend/src/hooks/useAutosave.ts` | Remove `content` from change detection |
| `frontend/src/api/nodes.ts` | Ensure `font_size` is included in update payload |
| `frontend/src/components/overlay/NodeEditor.tsx` | Local content state, all keyboard logic, font size shortcut |
| `frontend/src/components/canvas/NoteCard.tsx` | Use `node.font_size` for Konva Text fontSize |

## Supabase Migration

```sql
ALTER TABLE nodes ADD COLUMN font_size integer NOT NULL DEFAULT 13;
```

Run in Supabase SQL editor before deploying backend changes.
