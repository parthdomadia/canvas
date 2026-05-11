import { useRef, useCallback, useEffect, useState } from 'react'
import { Stage, Layer, Rect } from 'react-konva'
import Konva from 'konva'
import { useCanvasStore } from '@/store/canvasStore'
import { createNode } from '@/api/nodes'
import { NodeLayer } from './NodeLayer'
import { EdgeLayer } from './EdgeLayer'
import { SelectionBox } from './SelectionBox'
import { DotGrid } from './DotGrid'

const MIN_ZOOM = 0.1
const MAX_ZOOM = 5
const ZOOM_STEP = 1.08

export function CanvasStage() {
  const stageRef = useRef<Konva.Stage>(null)
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight })

  const canvasId = useCanvasStore((s) => s.canvasId)
  const storedViewport = useCanvasStore((s) => s.viewport)
  const { setViewport, addNode, setEditingNodeId, setSelectedIds } = useCanvasStore()

  // Draw-to-create state (existing)
  const [isDrawing, setIsDrawing] = useState(false)
  const [ghostRect, setGhostRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const lastClickTime = useRef<number>(0)
  const drawStart = useRef<{ x: number; y: number } | null>(null)
  const ghostRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null)

  // Rubber-band selection state
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const selectionStart = useRef<{ x: number; y: number } | null>(null)
  const selectionRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null)
  const isSelectingRef = useRef(false)

  // Space key tracking for pan mode
  const spaceHeld = useRef(false)

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

  // Track Space key for pan-via-space
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceHeld.current = true
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceHeld.current = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  // Reads live viewport from the Konva stage rather than Zustand viewport state,
  // which is only updated on wheel/dragEnd and would be stale during a drag.
  const toCanvasCoords = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return { x: 0, y: 0 }
    const pos = stage.getPointerPosition()
    if (!pos) return { x: 0, y: 0 }
    const scale = stage.scaleX()
    const stagePos = stage.position()
    return {
      x: (pos.x - stagePos.x) / scale,
      y: (pos.y - stagePos.y) / scale,
    }
  }, [])

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

  // Cancel Konva's native stage drag when Space is held — rubber-band takes over
  const handleStageDragStart = useCallback((_e: Konva.KonvaEventObject<MouseEvent>) => {
    if (_e.evt.button === 0 && spaceHeld.current) {
      stageRef.current?.stopDrag()
    }
  }, [])

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target === stageRef.current) {
        setSelectedIds([])
      }
    },
    [setSelectedIds],
  )

  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target !== stageRef.current) return
      if (e.evt.button !== 0) return

      const now = Date.now()
      if (now - lastClickTime.current < 300) {
        // Second click within threshold — enter draw mode
        const canvasPos = toCanvasCoords()
        drawStart.current = canvasPos
        setIsDrawing(true)
        setGhostRect({ x: canvasPos.x, y: canvasPos.y, w: 0, h: 0 })
        ghostRectRef.current = { x: canvasPos.x, y: canvasPos.y, w: 0, h: 0 }
        lastClickTime.current = 0
      } else {
        lastClickTime.current = now
        // Space + left click — rubber-band start
        if (spaceHeld.current) {
          const canvasPos = toCanvasCoords()
          selectionStart.current = canvasPos
          isSelectingRef.current = false
        }
      }
    },
    [toCanvasCoords],
  )

  const handleStageMouseMove = useCallback(
    (_e: Konva.KonvaEventObject<MouseEvent>) => {
      // Draw mode
      if (isDrawing && drawStart.current) {
        const canvasPos = toCanvasCoords()
        const rawW = canvasPos.x - drawStart.current.x
        const rawH = canvasPos.y - drawStart.current.y
        const updated = {
          x: rawW >= 0 ? drawStart.current.x : canvasPos.x,
          y: rawH >= 0 ? drawStart.current.y : canvasPos.y,
          w: Math.max(Math.abs(rawW), 80),
          h: Math.max(Math.abs(rawH), 60),
        }
        ghostRectRef.current = updated
        setGhostRect(updated)
        return
      }

      // Rubber-band selection (Space + drag)
      if (selectionStart.current && spaceHeld.current) {
        const canvasPos = toCanvasCoords()
        const rawW = canvasPos.x - selectionStart.current.x
        const rawH = canvasPos.y - selectionStart.current.y

        if (!isSelectingRef.current && Math.sqrt(rawW ** 2 + rawH ** 2) > 5) {
          isSelectingRef.current = true
        }

        if (isSelectingRef.current) {
          const updated = {
            x: rawW >= 0 ? selectionStart.current.x : canvasPos.x,
            y: rawH >= 0 ? selectionStart.current.y : canvasPos.y,
            w: Math.abs(rawW),
            h: Math.abs(rawH),
          }
          selectionRectRef.current = updated
          setSelectionRect(updated)
        }
      }
    },
    [isDrawing, toCanvasCoords],
  )

  const handleStageMouseUp = useCallback(
    async (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.evt.button !== 0) return

      // Draw mode
      if (isDrawing && drawStart.current) {
        const rect = ghostRectRef.current
        setIsDrawing(false)
        setGhostRect(null)
        ghostRectRef.current = null
        drawStart.current = null

        if (!canvasId || !rect) return

        const dragDistance = Math.sqrt(rect.w ** 2 + rect.h ** 2)
        const useDrawn = dragDistance > 10
        const x = useDrawn ? rect.x : rect.x - 100
        const y = useDrawn ? rect.y : rect.y - 60
        const width = useDrawn ? rect.w : undefined
        const height = useDrawn ? rect.h : undefined

        const node = await createNode(canvasId, x, y, width, height)
        addNode(node)
        setEditingNodeId(node.id)
        return
      }

      // Rubber-band selection
      if (isSelectingRef.current) {
        const rect = selectionRectRef.current
        isSelectingRef.current = false
        selectionStart.current = null
        selectionRectRef.current = null
        setSelectionRect(null)

        if (rect && rect.w > 0 && rect.h > 0) {
          const { nodes } = useCanvasStore.getState()
          const selected = Object.values(nodes)
            .filter(
              (node) =>
                node.x < rect.x + rect.w &&
                node.x + node.width > rect.x &&
                node.y < rect.y + rect.h &&
                node.y + node.height > rect.y,
            )
            .map((node) => node.id)
          setSelectedIds(selected)
        }
      } else {
        selectionStart.current = null
      }
    },
    [isDrawing, canvasId, addNode, setEditingNodeId, setSelectedIds],
  )

  return (
    <Stage
      ref={stageRef}
      width={size.width}
      height={size.height}
      draggable={!isDrawing}
      onWheel={handleWheel}
      onDragStart={handleStageDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleStageClick}
      onMouseDown={handleStageMouseDown}
      onMouseMove={handleStageMouseMove}
      onMouseUp={handleStageMouseUp}
      style={{ background: 'var(--canvas-bg)' }}
    >
      <Layer listening={false}>
        <DotGrid />
      </Layer>
      <EdgeLayer />
      <NodeLayer />
      {ghostRect && (
        <Layer listening={false}>
          <Rect
            x={ghostRect.x}
            y={ghostRect.y}
            width={ghostRect.w}
            height={ghostRect.h}
            stroke="#7c3aed"
            strokeWidth={1.5}
            dash={[6, 4]}
            fill="rgba(124, 58, 237, 0.05)"
            listening={false}
          />
        </Layer>
      )}
      {selectionRect && (
        <SelectionBox
          x={selectionRect.x}
          y={selectionRect.y}
          w={selectionRect.w}
          h={selectionRect.h}
        />
      )}
    </Stage>
  )
}
