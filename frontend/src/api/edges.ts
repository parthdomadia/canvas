import type { CanvasEdge } from '@/types'
import { apiClient } from './client'

export async function createEdge(
  canvasId: string,
  sourceId: string,
  targetId: string,
): Promise<CanvasEdge> {
  const res = await apiClient.post<CanvasEdge>(`/canvases/${canvasId}/edges`, {
    source_id: sourceId,
    target_id: targetId,
  })
  return res.data
}

export async function deleteEdge(id: string): Promise<void> {
  await apiClient.delete(`/edges/${id}`)
}

export async function updateEdge(
  id: string,
  patch: { label?: string | null; style?: string },
): Promise<CanvasEdge> {
  const res = await apiClient.patch<CanvasEdge>(`/edges/${id}`, patch)
  return res.data
}
