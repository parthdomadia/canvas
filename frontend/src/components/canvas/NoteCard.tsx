import { memo } from 'react'
import { Group, Rect, Text } from 'react-konva'
import Konva from 'konva'
import type { CanvasNode } from '@/types'

const NODE_PADDING = 12
const FONT_SIZE = 13
const CORNER_RADIUS = 8

interface NoteCardProps {
  node: CanvasNode
  isSelected: boolean
  onDragMove: (id: string, x: number, y: number) => void
  onDragEnd: (id: string, x: number, y: number) => void
  onDoubleClick: (id: string) => void
  onClick: (id: string, e: Konva.KonvaEventObject<MouseEvent>) => void
}

export const NoteCard = memo(function NoteCard({
  node, isSelected, onDragMove, onDragEnd, onDoubleClick, onClick,
}: NoteCardProps) {
  return (
    <Group
      x={node.x}
      y={node.y}
      draggable
      onDragMove={(e) => { e.cancelBubble = true; onDragMove(node.id, e.target.x(), e.target.y()) }}
      onDragEnd={(e) => { e.cancelBubble = true; onDragEnd(node.id, e.target.x(), e.target.y()) }}
      onDblClick={(e) => { e.cancelBubble = true; onDoubleClick(node.id) }}
      onClick={(e) => { e.cancelBubble = true; onClick(node.id, e) }}
    >
      <Rect
        width={node.width}
        height={node.height}
        fill="#1a1a2e"
        stroke={isSelected ? '#7c3aed' : '#2a2a3a'}
        strokeWidth={isSelected ? 2 : 1}
        cornerRadius={CORNER_RADIUS}
        shadowColor="rgba(0,0,0,0.35)"
        shadowBlur={isSelected ? 16 : 6}
        shadowOffsetY={2}
        shadowEnabled
      />
      <Text
        x={NODE_PADDING}
        y={NODE_PADDING}
        width={node.width - NODE_PADDING * 2}
        height={node.height - NODE_PADDING * 2}
        text={node.content || ''}
        fontSize={FONT_SIZE}
        fontFamily="system-ui, -apple-system, sans-serif"
        fill="#e2e8f0"
        lineHeight={1.5}
        wrap="word"
        ellipsis
        listening={false}
      />
    </Group>
  )
})
