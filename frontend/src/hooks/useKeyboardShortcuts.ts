import { useEffect } from 'react'
import { useCanvasStore } from '@/store/canvasStore'
import { deleteNode as apiDeleteNode } from '@/api/nodes'
import { deleteEdge as apiDeleteEdge } from '@/api/edges'
import { THEME_ORDER } from '@/styles/themes'

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const { editingNodeId, selectedIds, startDeleteNodes, deleteEdge, nodes, edges } =
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

      // Cycle theme: Ctrl+Shift+T
      if (e.key === 'T' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault()
        const { theme, setTheme } = useCanvasStore.getState()
        const idx = THEME_ORDER.indexOf(theme)
        setTheme(THEME_ORDER[(idx + 1) % THEME_ORDER.length])
        return
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
        e.preventDefault()
        const ids = Array.from(selectedIds)
        useCanvasStore.getState().setSelectedIds([])

        const nodeIds = ids.filter((id) => id in nodes)
        const edgeIds = ids.filter((id) => id in edges)

        // Nodes: mark for animated deletion — NoteCard plays tween then calls confirmDelete
        startDeleteNodes(nodeIds)
        // Edges: instant removal
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
