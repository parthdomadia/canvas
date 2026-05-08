import { useEffect } from 'react'
import { useCanvasStore } from '@/store/canvasStore'
import { deleteNode as apiDeleteNode } from '@/api/nodes'

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const { editingNodeId, selectedIds, deleteNode } = useCanvasStore.getState()

      if (editingNodeId) return

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
        e.preventDefault()
        const ids = Array.from(selectedIds)
        ids.forEach((id) => deleteNode(id))
        useCanvasStore.getState().setSelectedIds([])
        await Promise.all(ids.map((id) => apiDeleteNode(id).catch(console.error)))
      }

      if (e.key === 'Escape') {
        useCanvasStore.getState().setSelectedIds([])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
