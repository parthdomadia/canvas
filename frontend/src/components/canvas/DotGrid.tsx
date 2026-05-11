import { useMemo } from 'react'
import { Rect } from 'react-konva'
import { useCanvasStore } from '@/store/canvasStore'
import { THEMES } from '@/styles/themes'

const DOT_SPACING = 32
const DOT_RADIUS = 1.5
const CANVAS_EXTENT = 100_000

function makeDotPattern(color: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = DOT_SPACING
  canvas.height = DOT_SPACING
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(DOT_SPACING / 2, DOT_SPACING / 2, DOT_RADIUS, 0, Math.PI * 2)
  ctx.fill()
  return canvas
}

export function DotGrid() {
  const dotColor = useCanvasStore((s) => THEMES[s.theme].dotGrid)
  const patternCanvas = useMemo(() => makeDotPattern(dotColor), [dotColor])

  return (
    <Rect
      x={-CANVAS_EXTENT}
      y={-CANVAS_EXTENT}
      width={CANVAS_EXTENT * 2}
      height={CANVAS_EXTENT * 2}
      fillPatternImage={patternCanvas as unknown as HTMLImageElement}
      fillPatternRepeat="repeat"
      listening={false}
    />
  )
}
