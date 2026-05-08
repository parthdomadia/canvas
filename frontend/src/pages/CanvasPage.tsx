import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getOrCreateCanvas } from '@/api/canvases'
import { useCanvasStore } from '@/store/canvasStore'
import { CanvasStage } from '@/components/canvas/CanvasStage'
import { UIOverlay } from '@/components/overlay/UIOverlay'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useAutosave } from '@/hooks/useAutosave'

export function CanvasPage() {
  const hydrateCanvas = useCanvasStore((s) => s.hydrateCanvas)

  const { data: canvas, isLoading, isError } = useQuery({
    queryKey: ['canvas'],
    queryFn: getOrCreateCanvas,
  })

  useEffect(() => {
    if (canvas) {
      hydrateCanvas(canvas.id, canvas.nodes, canvas.edges, canvas.viewport)
    }
  }, [canvas, hydrateCanvas])

  useKeyboardShortcuts()
  useAutosave()

  if (isLoading) {
    return (
      <div style={{
        width: '100vw', height: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--canvas-bg)', color: 'var(--node-text)',
        fontSize: 14, letterSpacing: '0.05em',
      }}>
        Loading canvas...
      </div>
    )
  }

  if (isError) {
    return (
      <div style={{
        width: '100vw', height: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--canvas-bg)', color: '#f87171', fontSize: 14,
      }}>
        Could not connect to backend. Is it running on port 8000?
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <CanvasStage />
      <UIOverlay />
    </div>
  )
}
