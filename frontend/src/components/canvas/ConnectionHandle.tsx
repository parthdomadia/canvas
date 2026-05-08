import { Circle } from 'react-konva'

interface ConnectionHandleProps {
  x: number
  y: number
  nodeId: string
  onStartConnect: (nodeId: string) => void
}

export function ConnectionHandle({ x, y, nodeId, onStartConnect }: ConnectionHandleProps) {
  return (
    <Circle
      x={x}
      y={y}
      radius={6}
      fill="#7c3aed"
      stroke="#fff"
      strokeWidth={1.5}
      onMouseDown={(e) => {
        e.cancelBubble = true
        onStartConnect(nodeId)
      }}
    />
  )
}
