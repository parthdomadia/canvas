import { useMemo } from 'react'
import { Layer } from 'react-konva'
import { useCanvasStore } from '@/store/canvasStore'
import { EdgeLine } from './EdgeLine'

const TEAL = '#14B8A6'
const EGG_YOLK = '#F5C518'

export function EdgeLayer() {
  const edgesById = useCanvasStore((s) => s.edges)
  const edges = useMemo(() => Object.values(edgesById), [edgesById])
  const nodes = useCanvasStore((s) => s.nodes)
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const setSelectedIds = useCanvasStore((s) => s.setSelectedIds)

  // edgeHighlightColors: edge id → color (teal for directed path, egg yolk for simple neighbors)
  const edgeHighlightColors = useMemo(() => {
    const selectedNodeIds = new Set([...selectedIds].filter((id) => !!nodes[id]))
    const colors = new Map<string, string>()

    // Teal: BFS along directed edges source→target
    const visited = new Set<string>()
    const queue = [...selectedNodeIds]
    while (queue.length > 0) {
      const current = queue.pop()!
      for (const edge of edges) {
        if (edge.edge_type !== 'directed') continue
        if (edge.source_id !== current) continue
        colors.set(edge.id, TEAL)
        if (visited.has(edge.target_id) || selectedNodeIds.has(edge.target_id)) continue
        if (!nodes[edge.target_id]) continue
        visited.add(edge.target_id)
        queue.push(edge.target_id)
      }
    }

    // Egg yolk: simple edges directly touching a selected node
    for (const edge of edges) {
      if (edge.edge_type !== 'simple') continue
      if (selectedNodeIds.has(edge.source_id) || selectedNodeIds.has(edge.target_id)) {
        colors.set(edge.id, EGG_YOLK)
      }
    }

    return colors
  }, [edges, selectedIds, nodes])

  return (
    <Layer>
      {edges.map((edge) => (
        <EdgeLine
          key={edge.id}
          edge={edge}
          isSelected={selectedIds.has(edge.id)}
          highlightColor={!selectedIds.has(edge.id) ? (edgeHighlightColors.get(edge.id) ?? null) : null}
          onClick={(id) => setSelectedIds([id])}
        />
      ))}
    </Layer>
  )
}
