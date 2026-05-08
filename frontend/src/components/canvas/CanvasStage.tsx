import { useRef, useCallback, useEffect, useState } from 'react'
import { Stage, Layer } from 'react-konva'
import Konva from 'konva'

const MIN_ZOOM = 0.1
const MAX_ZOOM = 5
const ZOOM_STEP = 1.08

interface Viewport {
  x: number
  y: number
  z: number
}

export function CanvasStage() {
  const stageRef = useRef<Konva.Stage>(null)
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight })
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, z: 1 })

  // Keep stage size in sync with window
  useEffect(() => {
    const handleResize = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Zoom toward the pointer position (Figma-style)
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return

    const oldZoom = stage.scaleX()
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const direction = e.evt.deltaY < 0 ? 1 : -1
    const newZoom = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, oldZoom * (direction > 0 ? ZOOM_STEP : 1 / ZOOM_STEP)),
    )

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldZoom,
      y: (pointer.y - stage.y()) / oldZoom,
    }
    const newPos = {
      x: pointer.x - mousePointTo.x * newZoom,
      y: pointer.y - mousePointTo.y * newZoom,
    }

    stage.scale({ x: newZoom, y: newZoom })
    stage.position(newPos)
    setViewport({ x: newPos.x, y: newPos.y, z: newZoom })
  }, [])

  const handleDragEnd = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return
    const pos = stage.position()
    setViewport(v => ({ ...v, x: pos.x, y: pos.y }))
  }, [])

  return (
    <Stage
      ref={stageRef}
      width={size.width}
      height={size.height}
      draggable
      x={viewport.x}
      y={viewport.y}
      scaleX={viewport.z}
      scaleY={viewport.z}
      onWheel={handleWheel}
      onDragEnd={handleDragEnd}
      style={{ background: '#0d0d0d' }}
    >
      {/* Layers added in Phase 2 */}
      <Layer />
    </Stage>
  )
}
