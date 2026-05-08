import { describe, it, expect } from 'vitest'
import { canvasToScreen, screenToCanvas } from '../coordinates'

describe('canvasToScreen', () => {
  it('maps canvas origin to viewport pan position at zoom 1', () => {
    const result = canvasToScreen(0, 0, { x: 300, y: 200, z: 1 })
    expect(result).toEqual({ x: 300, y: 200 })
  })

  it('applies zoom and pan correctly', () => {
    const result = canvasToScreen(200, 100, { x: -100, y: -50, z: 2 })
    expect(result).toEqual({ x: 300, y: 150 })
  })

  it('returns same point at zoom=1, pan=0', () => {
    const result = canvasToScreen(450, 320, { x: 0, y: 0, z: 1 })
    expect(result).toEqual({ x: 450, y: 320 })
  })
})

describe('screenToCanvas', () => {
  it('is the exact inverse of canvasToScreen', () => {
    const viewport = { x: -100, y: -50, z: 2 }
    const screen = canvasToScreen(200, 100, viewport)
    const canvas = screenToCanvas(screen.x, screen.y, viewport)
    expect(canvas.x).toBeCloseTo(200)
    expect(canvas.y).toBeCloseTo(100)
  })

  it('maps screen point to canvas position at zoom 1', () => {
    const result = screenToCanvas(300, 200, { x: 0, y: 0, z: 1 })
    expect(result).toEqual({ x: 300, y: 200 })
  })

  it('accounts for pan offset', () => {
    const result = screenToCanvas(400, 300, { x: 100, y: 100, z: 1 })
    expect(result).toEqual({ x: 300, y: 200 })
  })
})
