import type { CanvasData } from '@/types'
import { apiClient } from './client'

const CANVAS_ID_KEY = 'canvas_id'

export async function getOrCreateCanvas(): Promise<CanvasData> {
  const storedId = localStorage.getItem(CANVAS_ID_KEY)

  if (storedId) {
    try {
      const res = await apiClient.get<CanvasData>(`/canvases/${storedId}`)
      return res.data
    } catch (err: unknown) {
      // Only clear the stored ID if the canvas genuinely doesn't exist (404).
      // Any other error (500, network, etc.) should surface rather than
      // silently creating a new canvas and losing the user's work.
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 404) {
        localStorage.removeItem(CANVAS_ID_KEY)
      } else {
        throw err
      }
    }
  }

  const res = await apiClient.post<CanvasData>('/canvases', {})
  localStorage.setItem(CANVAS_ID_KEY, res.data.id)
  return res.data
}

export async function updateCanvasViewport(
  id: string,
  viewport: { viewport_x: number; viewport_y: number; viewport_z: number },
): Promise<void> {
  await apiClient.patch(`/canvases/${id}`, viewport)
}

export async function updateCanvasTitle(id: string, title: string): Promise<void> {
  await apiClient.patch(`/canvases/${id}`, { title })
}
