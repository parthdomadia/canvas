import { memo, useEffect, useRef } from 'react'
import { Arrow, Group, Line } from 'react-konva'
import Konva from 'konva'
import type { CanvasEdge } from '@/types'
import { useCanvasStore } from '@/store/canvasStore'
import { THEMES } from '@/styles/themes'

// Module-level registry: edgeId → imperative update fn called during cluster drag
export const edgeUpdateFns = new Map<
  string,
  (sx: number, sy: number, tx: number, ty: number) => void
>()

interface EdgeLineProps {
  edge: CanvasEdge
  isSelected: boolean
  highlightColor: string | null
  onClick: (id: string) => void
}

export const EdgeLine = memo(function EdgeLine({
  edge, isSelected, highlightColor, onClick,
}: EdgeLineProps) {
  const sourceNode = useCanvasStore((s) => s.nodes[edge.source_id])
  const targetNode = useCanvasStore((s) => s.nodes[edge.target_id])
  const theme = useCanvasStore((s) => THEMES[s.theme])

  const visualLineRef = useRef<Konva.Line>(null)
  const arrowRef = useRef<Konva.Arrow>(null)
  const hitLineRef = useRef<Konva.Line>(null)

  // Register imperative update function so cluster drag can move edges without React
  useEffect(() => {
    edgeUpdateFns.set(edge.id, (sx, sy, tx, ty) => {
      visualLineRef.current?.points([sx, sy, tx, ty])
      hitLineRef.current?.points([sx, sy, tx, ty])
      if (arrowRef.current) {
        const mx = (sx + tx) / 2
        const my = (sy + ty) / 2
        const dx = tx - sx
        const dy = ty - sy
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len > 0) {
          const nx = dx / len
          const ny = dy / len
          const half = 12
          arrowRef.current.points([
            mx - nx * half, my - ny * half,
            mx + nx * half, my + ny * half,
          ])
        }
      }
    })
    return () => { edgeUpdateFns.delete(edge.id) }
  }, [edge.id])

  if (!sourceNode || !targetNode) return null

  const sx = sourceNode.x + sourceNode.width / 2
  const sy = sourceNode.y + sourceNode.height / 2
  const tx = targetNode.x + targetNode.width / 2
  const ty = targetNode.y + targetNode.height / 2

  const color = isSelected ? theme.accent : highlightColor ?? theme.edgeDefault
  const strokeWidth = isSelected || highlightColor ? 3 : 2

  const handleClick = (e: { cancelBubble: boolean }) => {
    e.cancelBubble = true
    onClick(edge.id)
  }

  if ((edge.edge_type ?? 'simple') === 'directed') {
    const mx = (sx + tx) / 2
    const my = (sy + ty) / 2
    const dx = tx - sx
    const dy = ty - sy
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len === 0) return null
    const nx = dx / len
    const ny = dy / len
    const half = 12

    return (
      <Group>
        <Line
          ref={visualLineRef}
          points={[sx, sy, tx, ty]}
          stroke={color}
          strokeWidth={strokeWidth}
          listening={false}
        />
        <Arrow
          ref={arrowRef}
          points={[mx - nx * half, my - ny * half, mx + nx * half, my + ny * half]}
          stroke={color}
          fill={color}
          strokeWidth={strokeWidth}
          pointerLength={10}
          pointerWidth={8}
          listening={false}
        />
        <Line
          ref={hitLineRef}
          points={[sx, sy, tx, ty]}
          stroke="transparent"
          strokeWidth={14}
          onClick={handleClick}
        />
      </Group>
    )
  }

  return (
    <Group>
      <Line
        ref={visualLineRef}
        points={[sx, sy, tx, ty]}
        stroke={color}
        strokeWidth={strokeWidth}
        listening={false}
      />
      <Line
        ref={hitLineRef}
        points={[sx, sy, tx, ty]}
        stroke="transparent"
        strokeWidth={14}
        onClick={handleClick}
      />
    </Group>
  )
})
