import { memo, useState } from 'react'
import { Group, Rect, Text } from 'react-konva'
import Konva from 'konva'
import { useCanvasStore } from '@/store/canvasStore'
import { THEMES } from '@/styles/themes'
import { ConnectionHandle } from './ConnectionHandle'

export const nodeGroupRefs = new Map<string, Konva.Group>()

const NODE_PADDING = 12
const CORNER_RADIUS = 8

interface NoteCardProps {
  nodeId: string
  isSelected: boolean
  isDirectedConnected?: boolean
  isSimpleConnected?: boolean
  onDragStart: (id: string) => void
  onDragMove: (id: string, x: number, y: number) => void
  onDragEnd: (id: string, x: number, y: number) => void
  onDoubleClick: (id: string) => void
  onClick: (id: string, e: Konva.KonvaEventObject<MouseEvent>) => void
  onStartConnect: (nodeId: string, edgeType: 'simple' | 'directed') => void
  onStartClusterDrag: (nodeId: string, e: Konva.KonvaEventObject<MouseEvent>) => void
}

export const NoteCard = memo(function NoteCard({
  nodeId, isSelected, isDirectedConnected = false, isSimpleConnected = false,
  onDragStart, onDragMove, onDragEnd, onDoubleClick, onClick, onStartConnect, onStartClusterDrag,
}: NoteCardProps) {
  const node = useCanvasStore((s) => s.nodes[nodeId])
  const theme = useCanvasStore((s) => THEMES[s.theme])
  const [hovered, setHovered] = useState(false)

  if (!node) return null

  const borderColor = isSelected
    ? theme.accent
    : isDirectedConnected
    ? theme.highlightDirected
    : isSimpleConnected
    ? theme.highlightSimple
    : theme.nodeBorder

  const shadowColor = isSelected
    ? theme.shadow
    : isDirectedConnected
    ? theme.highlightDirected
    : isSimpleConnected
    ? theme.highlightSimple
    : theme.shadow

  return (
    <Group
      ref={(g) => { if (g) nodeGroupRefs.set(nodeId, g); else nodeGroupRefs.delete(nodeId) }}
      x={node.x}
      y={node.y}
      draggable
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={(e) => {
        if (e.evt.button === 2) {
          e.cancelBubble = true
          e.evt.preventDefault()
          onStartClusterDrag(nodeId, e)
        }
      }}
      onDragStart={(e) => {
        if (e.evt.button === 2) {
          ;(e.target as Konva.Node).stopDrag()
          return
        }
        onDragStart(nodeId)
      }}
      onDragMove={(e) => { e.cancelBubble = true; onDragMove(nodeId, e.target.x(), e.target.y()) }}
      onDragEnd={(e) => { e.cancelBubble = true; onDragEnd(nodeId, e.target.x(), e.target.y()) }}
      onDblClick={(e) => { e.cancelBubble = true; onDoubleClick(nodeId) }}
      onClick={(e) => { e.cancelBubble = true; onClick(nodeId, e) }}
    >
      <Rect
        width={node.width}
        height={node.height}
        fill={theme.nodeBg}
        stroke={borderColor}
        strokeWidth={isSelected || isDirectedConnected || isSimpleConnected ? 2 : 1}
        cornerRadius={CORNER_RADIUS}
        shadowColor={shadowColor}
        shadowBlur={isSelected ? 16 : isDirectedConnected || isSimpleConnected ? 7 : 6}
        shadowOffsetY={2}
        shadowEnabled
      />
      <Text
        x={NODE_PADDING}
        y={NODE_PADDING}
        width={node.width - NODE_PADDING * 2}
        height={node.height - NODE_PADDING * 2}
        text={node.content || ''}
        fontSize={node.font_size}
        fontFamily="Alpino, system-ui, -apple-system, sans-serif"
        fill={theme.nodeText}
        lineHeight={1.5}
        wrap="word"
        ellipsis
        listening={false}
      />
      {(hovered || isSelected) && (
        <>
          <ConnectionHandle x={node.width / 2} y={0}               nodeId={nodeId} onStartConnect={onStartConnect} />
          <ConnectionHandle x={node.width}     y={node.height / 2}  nodeId={nodeId} onStartConnect={onStartConnect} />
          <ConnectionHandle x={node.width / 2} y={node.height}      nodeId={nodeId} onStartConnect={onStartConnect} />
          <ConnectionHandle x={0}              y={node.height / 2}  nodeId={nodeId} onStartConnect={onStartConnect} />
        </>
      )}
    </Group>
  )
})
