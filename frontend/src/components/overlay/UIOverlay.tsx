import { useCanvasStore } from '@/store/canvasStore'
import { NodeEditor } from './NodeEditor'
import { ShortcutsModal } from './ShortcutsModal'
import { EmptyState } from './EmptyState'

export function UIOverlay() {
  const editingNodeId = useCanvasStore((s) => s.editingNodeId)
  const nodes = useCanvasStore((s) => s.nodes)
  const viewport = useCanvasStore((s) => s.viewport)
  const setEditingNodeId = useCanvasStore((s) => s.setEditingNodeId)

  const editingNode = editingNodeId ? nodes[editingNodeId] : null

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <ShortcutsModal />
      {Object.keys(nodes).length === 0 && <EmptyState />}
      {editingNode && (
        <div style={{ pointerEvents: 'all' }}>
          <NodeEditor
            node={editingNode}
            viewport={viewport}
            onClose={() => setEditingNodeId(null)}
          />
        </div>
      )}
    </div>
  )
}
