import { useCanvasStore } from '@/store/canvasStore'
import { NodeEditor } from './NodeEditor'

export function UIOverlay() {
  const editingNodeId = useCanvasStore((s) => s.editingNodeId)
  const nodes = useCanvasStore((s) => s.nodes)
  const viewport = useCanvasStore((s) => s.viewport)
  const { updateNode, setEditingNodeId } = useCanvasStore()

  const editingNode = editingNodeId ? nodes[editingNodeId] : null

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {editingNode && (
        <div style={{ pointerEvents: 'all' }}>
          <NodeEditor
            node={editingNode}
            viewport={viewport}
            onChange={(content) => updateNode(editingNode.id, { content })}
            onClose={() => setEditingNodeId(null)}
          />
        </div>
      )}
    </div>
  )
}
