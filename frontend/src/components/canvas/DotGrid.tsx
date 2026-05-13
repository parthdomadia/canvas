import { useState, useEffect } from 'react'
import { Rect } from 'react-konva'
import { useCanvasStore } from '@/store/canvasStore'
import { THEMES } from '@/styles/themes'

const DOT_SPACING = 24
const DOT_RADIUS = 1.5
const CANVAS_EXTENT = 100_000

function makeDotPatternImage(color: string): Promise<HTMLImageElement> {
  const canvas = document.createElement('canvas')
  canvas.width = DOT_SPACING
  canvas.height = DOT_SPACING
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, DOT_SPACING, DOT_SPACING)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(DOT_SPACING / 2, DOT_SPACING / 2, DOT_RADIUS, 0, Math.PI * 2)
  ctx.fill()
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.src = canvas.toDataURL()
  })
}

export function DotGrid() {
  const dotColor = useCanvasStore((s) => THEMES[s.theme].dotGrid)
  const [patternImg, setPatternImg] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    let cancelled = false
    makeDotPatternImage(dotColor).then((img) => {
      if (!cancelled) setPatternImg(img)
    })
    return () => { cancelled = true }
  }, [dotColor])

  if (!patternImg) return null

  return (
    <Rect
      x={-CANVAS_EXTENT}
      y={-CANVAS_EXTENT}
      width={CANVAS_EXTENT * 2}
      height={CANVAS_EXTENT * 2}
      fillPatternImage={patternImg}
      fillPatternRepeat="repeat"
      listening={false}
    />
  )
}
