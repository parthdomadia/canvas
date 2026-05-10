# Shortcuts Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `⌨ Shortcuts` pill button in the top-left corner that opens a polished in-app modal listing all keyboard shortcuts grouped by category.

**Architecture:** A new `ShortcutsModal` component owns both the trigger button and the modal overlay using local `useState`. It is added to the existing `UIOverlay`. No Zustand store changes. CSS keyframe animation lives in `globals.css`.

**Tech Stack:** React 18 + TypeScript, Vitest + React Testing Library, CSS custom properties (theme-aware), Alpino font

---

## File Map

| File | Change |
|---|---|
| `frontend/src/styles/globals.css` | Add `@keyframes shortcuts-modal-in` + `.shortcuts-modal-enter` |
| `frontend/src/components/overlay/ShortcutsModal.tsx` | New — pill button + grouped modal |
| `frontend/src/components/overlay/__tests__/ShortcutsModal.test.tsx` | New — 8 tests |
| `frontend/src/components/overlay/UIOverlay.tsx` | Add `<ShortcutsModal />` |

---

### Task 1: CSS animation

**Files:**
- Modify: `frontend/src/styles/globals.css`

- [ ] **Step 1: Add keyframe and class to globals.css**

Open `frontend/src/styles/globals.css`. Append the following at the end of the file:

```css
@keyframes shortcuts-modal-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.shortcuts-modal-enter {
  animation: shortcuts-modal-in 180ms ease-out forwards;
}
```

- [ ] **Step 2: Verify the file saved correctly**

Run: `head -20 frontend/src/styles/globals.css` (just confirm no syntax errors — CSS has no build step to check here; the Vite dev server will catch issues at runtime)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/styles/globals.css
git commit -m "feat: add shortcuts-modal-in keyframe animation"
```

---

### Task 2: ShortcutsModal component, tests, and UIOverlay wiring

**Files:**
- Create: `frontend/src/components/overlay/__tests__/ShortcutsModal.test.tsx`
- Create: `frontend/src/components/overlay/ShortcutsModal.tsx`
- Modify: `frontend/src/components/overlay/UIOverlay.tsx`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/overlay/__tests__/ShortcutsModal.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShortcutsModal } from '../ShortcutsModal'

describe('ShortcutsModal', () => {
  it('renders the trigger button', () => {
    render(<ShortcutsModal />)
    expect(screen.getByRole('button', { name: /open keyboard shortcuts/i })).toBeInTheDocument()
  })

  it('modal is not shown initially', () => {
    render(<ShortcutsModal />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens modal when trigger button is clicked', async () => {
    const user = userEvent.setup()
    render(<ShortcutsModal />)
    await user.click(screen.getByRole('button', { name: /open keyboard shortcuts/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
  })

  it('closes modal when × button is clicked', async () => {
    const user = userEvent.setup()
    render(<ShortcutsModal />)
    await user.click(screen.getByRole('button', { name: /open keyboard shortcuts/i }))
    await user.click(screen.getByRole('button', { name: /close shortcuts/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes modal when Escape is pressed', async () => {
    const user = userEvent.setup()
    render(<ShortcutsModal />)
    await user.click(screen.getByRole('button', { name: /open keyboard shortcuts/i }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes modal when backdrop is clicked', async () => {
    const user = userEvent.setup()
    render(<ShortcutsModal />)
    await user.click(screen.getByRole('button', { name: /open keyboard shortcuts/i }))
    await user.click(screen.getByRole('dialog'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not close modal when card content is clicked', async () => {
    const user = userEvent.setup()
    render(<ShortcutsModal />)
    await user.click(screen.getByRole('button', { name: /open keyboard shortcuts/i }))
    await user.click(screen.getByText('Keyboard Shortcuts'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('displays all five shortcut groups', async () => {
    const user = userEvent.setup()
    render(<ShortcutsModal />)
    await user.click(screen.getByRole('button', { name: /open keyboard shortcuts/i }))
    expect(screen.getByText('Canvas')).toBeInTheDocument()
    expect(screen.getByText('Selection & Actions')).toBeInTheDocument()
    expect(screen.getByText('History')).toBeInTheDocument()
    expect(screen.getByText('Node Editing')).toBeInTheDocument()
    expect(screen.getByText('Appearance')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/components/overlay/__tests__/ShortcutsModal.test.tsx
```

Expected: FAIL — `ShortcutsModal` not found.

- [ ] **Step 3: Implement ShortcutsModal**

Create `frontend/src/components/overlay/ShortcutsModal.tsx`:

```tsx
import { useState, useEffect, useCallback } from 'react'

interface ShortcutEntry {
  keys: string[][]   // outer array = alternatives (joined by "/"), inner array = combo keys (joined by "+")
  description: string
}

interface ShortcutGroup {
  label: string
  note?: string
  shortcuts: ShortcutEntry[]
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    label: 'Canvas',
    shortcuts: [
      { keys: [['Double-click']], description: 'Create node' },
      { keys: [['Right-click', 'Drag']], description: 'Move node cluster' },
    ],
  },
  {
    label: 'Selection & Actions',
    shortcuts: [
      { keys: [['Click']], description: 'Select node or edge' },
      { keys: [['Ctrl', 'Click']], description: 'Multi-select' },
      { keys: [['Delete'], ['Backspace']], description: 'Delete selected' },
      { keys: [['Escape']], description: 'Deselect all' },
    ],
  },
  {
    label: 'History',
    shortcuts: [
      { keys: [['Ctrl', 'Z']], description: 'Undo' },
      { keys: [['Ctrl', 'Y'], ['Ctrl', 'Shift', 'Z']], description: 'Redo' },
    ],
  },
  {
    label: 'Node Editing',
    note: 'active while editing a node',
    shortcuts: [
      { keys: [['Escape']], description: 'Save and close' },
      { keys: [['Enter']], description: 'New line' },
      { keys: [['- Space']], description: 'Convert to bullet •' },
      { keys: [['Ctrl', 'Shift', '<']], description: 'Decrease font size' },
      { keys: [['Ctrl', 'Shift', '>']], description: 'Increase font size' },
    ],
  },
  {
    label: 'Appearance',
    shortcuts: [
      { keys: [['Ctrl', 'Shift', 'T']], description: 'Cycle theme' },
    ],
  },
]

const KBD_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.18)',
  borderBottom: '2px solid rgba(255,255,255,0.18)',
  borderRadius: 5,
  padding: '2px 7px',
  fontSize: 11,
  fontFamily: 'monospace',
  color: 'var(--node-text)',
  lineHeight: 1.6,
}

const SEPARATOR_STYLE: React.CSSProperties = {
  color: 'var(--node-text-secondary)',
  fontSize: 11,
}

export function ShortcutsModal() {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open, close])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open keyboard shortcuts"
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 14px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: 'var(--node-text)',
          fontSize: 12,
          fontFamily: "'Alpino', system-ui, -apple-system, sans-serif",
          cursor: 'pointer',
          transition: 'background 150ms',
          pointerEvents: 'all',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
      >
        ⌨ Shortcuts
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
          onClick={close}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
            pointerEvents: 'all',
          }}
        >
          <div
            className="shortcuts-modal-enter"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 480,
              maxHeight: '75vh',
              overflowY: 'auto',
              background: 'var(--node-bg)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              padding: 24,
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}>
              <span style={{
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--node-text)',
                fontFamily: "'Alpino', system-ui, -apple-system, sans-serif",
              }}>
                Keyboard Shortcuts
              </span>
              <button
                onClick={close}
                aria-label="Close shortcuts"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--node-text-secondary)',
                  fontSize: 20,
                  lineHeight: 1,
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontFamily: 'inherit',
                }}
              >
                ×
              </button>
            </div>

            {/* Groups */}
            {SHORTCUT_GROUPS.map((group, gi) => (
              <div key={group.label} style={{ marginBottom: gi < SHORTCUT_GROUPS.length - 1 ? 24 : 0 }}>
                {/* Group label */}
                <div style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--node-text-secondary)',
                  marginBottom: 8,
                  fontFamily: "'Alpino', system-ui, -apple-system, sans-serif",
                }}>
                  {group.label}
                  {group.note && (
                    <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                      {' '}— {group.note}
                    </span>
                  )}
                </div>

                {/* Shortcut rows */}
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '7px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <span style={{
                      fontSize: 13,
                      color: 'var(--node-text)',
                      fontFamily: "'Alpino', system-ui, -apple-system, sans-serif",
                    }}>
                      {shortcut.description}
                    </span>

                    {/* Key combos (alternatives separated by "/") */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {shortcut.keys.map((combo, ci) => (
                        <span key={ci} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {ci > 0 && <span style={SEPARATOR_STYLE}>/</span>}
                          {combo.map((key, ki) => (
                            <span key={ki} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              {ki > 0 && <span style={SEPARATOR_STYLE}>+</span>}
                              <kbd style={KBD_STYLE}>{key}</kbd>
                            </span>
                          ))}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/components/overlay/__tests__/ShortcutsModal.test.tsx
```

Expected: 8/8 PASS

- [ ] **Step 5: Wire ShortcutsModal into UIOverlay**

Open `frontend/src/components/overlay/UIOverlay.tsx`. Add the import and component:

```tsx
import { useCanvasStore } from '@/store/canvasStore'
import { NodeEditor } from './NodeEditor'
import { ShortcutsModal } from './ShortcutsModal'

export function UIOverlay() {
  const editingNodeId = useCanvasStore((s) => s.editingNodeId)
  const nodes = useCanvasStore((s) => s.nodes)
  const viewport = useCanvasStore((s) => s.viewport)
  const setEditingNodeId = useCanvasStore((s) => s.setEditingNodeId)

  const editingNode = editingNodeId ? nodes[editingNodeId] : null

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <ShortcutsModal />
      {editingNode && (
        <div style={{ pointerEvents: 'all' }}>
          <NodeEditor
            node={editingNode}
            viewport={viewport}
            onClose={() => setEditingNodeId(null)}
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Run all tests to confirm nothing broke**

```bash
cd frontend && npx vitest run
```

Expected: all tests pass (existing tests + 8 new ShortcutsModal tests)

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/overlay/ShortcutsModal.tsx \
        frontend/src/components/overlay/__tests__/ShortcutsModal.test.tsx \
        frontend/src/components/overlay/UIOverlay.tsx
git commit -m "feat: add shortcuts modal with pill trigger button"
```
