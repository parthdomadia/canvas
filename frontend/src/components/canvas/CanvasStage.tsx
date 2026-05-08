import { useRef, useCallback, useEffect, useState } from 'react'
import { Stage } from 'react-konva'
import Konva from 'konva'
import { useCanvasStore } from '@/store/canvasStore'
import { screenToCanvas } from '@/utils/coordinates'
import { createNode } from '@/api/nodes'
import { NodeLayer } from './NodeLayer'
import { EdgeLayer } from './EdgeLayer'

const MIN_ZOOM = 0.1
const MAX_ZOOM = 5
const ZOOM_STEP = 1.08

export function CanvasStage() {
  const stageRef = useRef<Konva.Stage>(null)
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight })

  const canvasId = useCanvasStore((s) => s.canvasId)
  const storedViewport = useCanvasStore((s) => s.viewport)
  const { setViewport, addNode, setEditingNodeId, setSelectedIds } = useCanvasStore()

  useEffect(() => {
    const handleResize = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (canvasId && stageRef.current) {
      stageRef.current.position({ x: storedViewport.x, y: storedViewport.y })
      stageRef.current.scale({ x: storedViewport.z, y: storedViewport.z })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasId])

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
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
    },
    [setViewport],
  )

  const handleDragEnd = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return
    const pos = stage.position()
    setViewport({ x: pos.x, y: pos.y, z: stage.scaleX() })
  }, [setViewport])

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target === stageRef.current) {
        setSelectedIds([])
      }
    },
    [setSelectedIds],
  )

  const handleStageDblClick = useCallback(
    async (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target !== stageRef.current) return
      if (!canvasId) return

      const stage = stageRef.current!
      const pointer = stage.getPointerPosition()!
      const viewport = useCanvasStore.getState().viewport
      const canvasPos = screenToCanvas(pointer.x, pointer.y, viewport)

      const x = canvasPos.x - 100
      const y = canvasPos.y - 60

      const node = await createNode(canvasId, x, y)
      addNode(node)
      setEditingNodeId(node.id)
    },
    [canvasId, addNode, setEditingNodeId],
  )

  return (
    <Stage
      ref={stageRef}
      width={size.width}
      height={size.height}
      draggable
      onWheel={handleWheel}
      onDragEnd={handleDragEnd}
      onClick={handleStageClick}
      onDblClick={handleStageDblClick}
      style={{ background: 'var(--canvas-bg)' }}
    >
      <EdgeLayer />
      <NodeLayer />
    </Stage>
  )
}
