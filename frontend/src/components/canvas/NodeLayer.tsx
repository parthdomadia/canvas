import { useRef, useState } from 'react'
import { Layer, Line } from 'react-konva'
import Konva from 'konva'
import { useCanvasStore } from '@/store/canvasStore'
import { createEdge } from '@/api/edges'
import { NoteCard } from './NoteCard'

export function NodeLayer() {
  const nodes = useCanvasStore((s) => Object.values(s.nodes))
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const { updateNode, setSelectedIds, setEditingNodeId, addEdge } = useCanvasStore()

  const connectingFromId = useRef<string | null>(null)
  const [previewLine, setPreviewLine] = useState<[number, number, number, number] | null>(null)

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
    // If we're in connect mode and click a different node, create edge
    if (connectingFromId.current && connectingFromId.current !== id) {
      const sourceId = connectingFromId.current
      connectingFromId.current = null
      setPreviewLine(null)

      const store = useCanvasStore.getState()
      createEdge(store.canvasId, sourceId, id)
        .then((edge) => addEdge(edge))
        .catch(console.error)
      return
    }

    if (e.evt.shiftKey) {
      const next = new Set(selectedIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      setSelectedIds(Array.from(next))
    } else {
      setSelectedIds([id])
    }
  }

  const handleStartConnect = (nodeId: string) => {
    connectingFromId.current = nodeId
    const node = useCanvasStore.getState().nodes[nodeId]
    if (!node) return
    const cx = node.x + node.width / 2
    const cy = node.y + node.height / 2
    setPreviewLine([cx, cy, cx, cy])
  }

  const handleLayerMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!connectingFromId.current || !previewLine) return
    const stage = e.target.getStage()
    if (!stage) return
    const pos = stage.getPointerPosition()
    if (!pos) return
    // Convert screen to canvas space
    const scale = stage.scaleX()
    const stagePos = stage.position()
    const canvasX = (pos.x - stagePos.x) / scale
    const canvasY = (pos.y - stagePos.y) / scale
    setPreviewLine([previewLine[0], previewLine[1], canvasX, canvasY])
  }

  const handleLayerMouseUp = () => {
    // If mouse released on empty canvas, cancel connection
    if (connectingFromId.current) {
      connectingFromId.current = null
      setPreviewLine(null)
    }
  }

  return (
    <Layer onMouseMove={handleLayerMouseMove} onMouseUp={handleLayerMouseUp}>
      {previewLine && (
        <Line
          points={previewLine}
          stroke="#7c3aed"
          strokeWidth={1.5}
          dash={[6, 4]}
          listening={false}
        />
      )}
      {nodes.map((node) => (
        <NoteCard
          key={node.id}
          node={node}
          isSelected={selectedIds.has(node.id)}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDoubleClick={handleDblClick}
          onClick={handleClick}
          onStartConnect={handleStartConnect}
        />
      ))}
    </Layer>
  )
}
