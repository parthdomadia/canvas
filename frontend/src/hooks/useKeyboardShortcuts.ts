import { useEffect } from 'react'
import { useCanvasStore } from '@/store/canvasStore'
import { deleteNode as apiDeleteNode } from '@/api/nodes'
import { deleteEdge as apiDeleteEdge } from '@/api/edges'

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const { editingNodeId, selectedIds, deleteNode, deleteEdge, nodes, edges } =
        useCanvasStore.getState()

      if (editingNodeId) return

      // Undo: Ctrl+Z
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault()
        useCanvasStore.temporal.getState().undo()
        return
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (
        (e.key === 'y' && (e.ctrlKey || e.metaKey)) ||
        (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)
      ) {
        e.preventDefault()
        useCanvasStore.temporal.getState().redo()
        return
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
        e.preventDefault()
        const ids = Array.from(selectedIds)
        useCanvasStore.getState().setSelectedIds([])

        const nodeIds = ids.filter((id) => id in nodes)
        const edgeIds = ids.filter((id) => id in edges)

        nodeIds.forEach((id) => deleteNode(id))
        edgeIds.forEach((id) => deleteEdge(id))

        await Promise.all([
          ...nodeIds.map((id) => apiDeleteNode(id).catch(console.error)),
          ...edgeIds.map((id) => apiDeleteEdge(id).catch(console.error)),
        ])
      }

      if (e.key === 'Escape') {
        useCanvasStore.getState().setSelectedIds([])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
