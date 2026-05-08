import { useStore } from 'zustand'
import { useCanvasStore } from '@/store/canvasStore'

export function Toolbar() {
  const { pastStates, futureStates, undo, redo } = useStore(useCanvasStore.temporal)
  const canUndo = pastStates.length > 0
  const canRedo = futureStates.length > 0

  return (
    <div style={{
      position: 'absolute',
      top: 16,
      left: 16,
      zIndex: 10,
      display: 'flex',
      gap: 4,
      background: 'rgba(26, 26, 46, 0.92)',
      border: '1px solid #2a2a3a',
      borderRadius: 8,
      padding: '5px 8px',
      backdropFilter: 'blur(8px)',
    }}>
      <button
        onClick={undo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        style={{
          background: 'none',
          border: 'none',
          color: canUndo ? '#e2e8f0' : '#3a3a5a',
          cursor: canUndo ? 'pointer' : 'not-allowed',
          fontSize: 16,
          padding: '2px 8px',
          borderRadius: 4,
          lineHeight: 1,
          transition: 'color 0.1s',
        }}
      >
        ↩
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
        style={{
          background: 'none',
          border: 'none',
          color: canRedo ? '#e2e8f0' : '#3a3a5a',
          cursor: canRedo ? 'pointer' : 'not-allowed',
          fontSize: 16,
          padding: '2px 8px',
          borderRadius: 4,
          lineHeight: 1,
          transition: 'color 0.1s',
        }}
      >
        ↪
      </button>
    </div>
  )
}
