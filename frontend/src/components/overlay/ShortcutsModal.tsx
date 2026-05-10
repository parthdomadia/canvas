import { useState, useEffect, useCallback, useRef } from 'react'

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
      { keys: [['-', 'Space']], description: 'Convert to bullet •' },
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
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus()
    }
  }, [open])

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
        type="button"
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
                ref={closeButtonRef}
                type="button"
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
