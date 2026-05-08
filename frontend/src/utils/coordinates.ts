import type { Viewport } from '@/types'

/**
 * Convert canvas-space coordinates to screen-space pixels.
 * screenX = canvasX * zoom + panX
 */
export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  viewport: Viewport,
): { x: number; y: number } {
  return {
    x: canvasX * viewport.z + viewport.x,
    y: canvasY * viewport.z + viewport.y,
  }
}

/**
 * Convert screen-space pixels to canvas-space coordinates.
 * canvasX = (screenX - panX) / zoom
 */
export function screenToCanvas(
  screenX: number,
  screenY: number,
  viewport: Viewport,
): { x: number; y: number } {
  return {
    x: (screenX - viewport.x) / viewport.z,
    y: (screenY - viewport.y) / viewport.z,
  }
}
