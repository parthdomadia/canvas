import { Layer } from 'react-konva'
import { useCanvasStore } from '@/store/canvasStore'
import { EdgeLine } from './EdgeLine'

export function EdgeLayer() {
  const edges = useCanvasStore((s) => Object.values(s.edges))
  const nodes = useCanvasStore((s) => s.nodes)
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const setSelectedIds = useCanvasStore((s) => s.setSelectedIds)

  return (
    <Layer>
      {edges.map((edge) => {
        const sourceNode = nodes[edge.source_id]
        const targetNode = nodes[edge.target_id]
        if (!sourceNode || !targetNode) return null

        return (
          <EdgeLine
            key={edge.id}
            edge={edge}
            sourceNode={sourceNode}
            targetNode={targetNode}
            isSelected={selectedIds.has(edge.id)}
            onClick={(id) => setSelectedIds([id])}
          />
        )
      })}
    </Layer>
  )
}
