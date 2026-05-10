import type { CanvasNode } from '@/types'
import { apiClient } from './client'

export async function createNode(
  canvasId: string,
  x: number,
  y: number,
  width?: number,
  height?: number,
): Promise<CanvasNode> {
  const body: { x: number; y: number; width?: number; height?: number } = { x, y }
  if (width !== undefined) body.width = width
  if (height !== undefined) body.height = height
  const res = await apiClient.post<CanvasNode>(`/canvases/${canvasId}/nodes`, body)
  return res.data
}

export async function updateNode(
  id: string,
  patch: Partial<Pick<CanvasNode, 'content' | 'x' | 'y' | 'width' | 'height' | 'color' | 'z_index' | 'font_size'>>,
): Promise<CanvasNode> {
  const res = await apiClient.patch<CanvasNode>(`/nodes/${id}`, patch)
  return res.data
}

export async function deleteNode(id: string): Promise<void> {
  await apiClient.delete(`/nodes/${id}`)
}

export async function batchUpdateNodePositions(
  canvasId: string,
  updates: { id: string; x: number; y: number }[],
): Promise<void> {
  await apiClient.patch(`/canvases/${canvasId}/nodes/batch`, { updates })
}
