import { Layer } from 'react-konva'
import Konva from 'konva'
import { useCanvasStore } from '@/store/canvasStore'
import { NoteCard } from './NoteCard'

export function NodeLayer() {
  const nodes = useCanvasStore((s) => Object.values(s.nodes))
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const { updateNode, setSelectedIds, setEditingNodeId } = useCanvasStore()

  const handleDragMove = (id: string, x: number, y: number) => {
    updateNode(id, { x, y })
  }

  const handleDragEnd = (id: string, x: number, y: number) => {
    updateNode(id, { x, y })
  }

  const handleDblClick = (id: string) => {
    setEditingNodeId(id)
  }

  const handleClick = (id: string, e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.shiftKey) {
      const next = new Set(selectedIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      setSelectedIds(Array.from(next))
    } else {
      setSelectedIds([id])
    }
  }

  return (
    <Layer>
      {nodes.map((node) => (
        <NoteCard
          key={node.id}
          node={node}
          isSelected={selectedIds.has(node.id)}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDoubleClick={handleDblClick}
          onClick={handleClick}
        />
      ))}
    </Layer>
  )
}
