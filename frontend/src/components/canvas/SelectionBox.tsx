import { Layer, Rect } from 'react-konva'

interface SelectionBoxProps {
  x: number
  y: number
  w: number
  h: number
}

export function SelectionBox({ x, y, w, h }: SelectionBoxProps) {
  return (
    <Layer listening={false}>
      <Rect
        x={x}
        y={y}
        width={w}
        height={h}
        stroke="#7c3aed"
        strokeWidth={1}
        dash={[4, 3]}
        fill="rgba(124, 58, 237, 0.05)"
        listening={false}
      />
    </Layer>
  )
}
