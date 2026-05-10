import { Circle } from 'react-konva'
import { useCanvasStore } from '@/store/canvasStore'
import { THEMES } from '@/styles/themes'

interface ConnectionHandleProps {
  x: number
  y: number
  nodeId: string
  onStartConnect: (nodeId: string, edgeType: 'simple' | 'directed') => void
}

export function ConnectionHandle({ x, y, nodeId, onStartConnect }: ConnectionHandleProps) {
  const accent = useCanvasStore((s) => THEMES[s.theme].accent)

  return (
    <Circle
      x={x}
      y={y}
      radius={6}
      fill={accent}
      stroke="#fff"
      strokeWidth={1.5}
      onMouseDown={(e) => {
        e.cancelBubble = true
        e.evt.preventDefault()
        const edgeType = e.evt.button === 2 ? 'directed' : 'simple'
        onStartConnect(nodeId, edgeType)
      }}
      onContextMenu={(e) => {
        e.cancelBubble = true
        e.evt.preventDefault()
      }}
    />
  )
}
