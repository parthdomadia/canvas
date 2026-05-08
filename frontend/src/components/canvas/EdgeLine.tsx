import { memo } from 'react'
import { Arrow } from 'react-konva'
import type { CanvasEdge, CanvasNode } from '@/types'

interface EdgeLineProps {
  edge: CanvasEdge
  sourceNode: CanvasNode
  targetNode: CanvasNode
  isSelected: boolean
  onClick: (id: string) => void
}

export const EdgeLine = memo(function EdgeLine({
  edge, sourceNode, targetNode, isSelected, onClick,
}: EdgeLineProps) {
  const sx = sourceNode.x + sourceNode.width / 2
  const sy = sourceNode.y + sourceNode.height / 2
  const tx = targetNode.x + targetNode.width / 2
  const ty = targetNode.y + targetNode.height / 2

  return (
    <Arrow
      points={[sx, sy, tx, ty]}
      stroke={isSelected ? '#7c3aed' : '#4a4a6a'}
      strokeWidth={isSelected ? 2.5 : 1.5}
      fill={isSelected ? '#7c3aed' : '#4a4a6a'}
      pointerLength={10}
      pointerWidth={8}
      onClick={(e) => { e.cancelBubble = true; onClick(edge.id) }}
      hitStrokeWidth={12}
    />
  )
})
