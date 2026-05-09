import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Layer, Line, Transformer } from 'react-konva'
import Konva from 'konva'
import { useCanvasStore } from '@/store/canvasStore'
import { createEdge } from '@/api/edges'
import { updateNode as updateNodeApi, batchUpdateNodePositions } from '@/api/nodes'
import { NoteCard, nodeGroupRefs } from './NoteCard'
import { edgeUpdateFns } from './EdgeLine'

export function NodeLayer() {
  const nodesById = useCanvasStore((s) => s.nodes)
  const nodeIds = useMemo(() => Object.keys(nodesById), [nodesById])
  const edgesById = useCanvasStore((s) => s.edges)
  const edges = useMemo(() => Object.values(edgesById), [edgesById])
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const { updateNode, moveNodes, setSelectedIds, setEditingNodeId } = useCanvasStore()

  const transformerRef = useRef<Konva.Transformer>(null)
  const multiDragInitialPositions = useRef<Map<string, { x: number; y: number }> | null>(null)

  const connectingFromId = useRef<string | null>(null)
  const connectingEdgeType = useRef<'simple' | 'directed'>('simple')
  const [previewLine, setPreviewLine] = useState<[number, number, number, number] | null>(null)

  useEffect(() => {
    const tr = transformerRef.current
    if (!tr) return

    const selectedArr = [...selectedIds].filter((id) => !!nodesById[id])
    if (selectedArr.length === 1) {
      const group = nodeGroupRefs.get(selectedArr[0])
      tr.nodes(group ? [group] : [])
    } else {
      tr.nodes([])
    }
    tr.getLayer()?.batchDraw()
  }, [selectedIds, nodesById])

  // Teal: transitive BFS following directed edges source→target
  // Egg yolk: direct neighbors via simple edges (one hop, both directions)
  const { directedConnectedIds, simpleConnectedIds } = useMemo(() => {
    const selectedNodeIds = new Set([...selectedIds].filter((id) => !!nodesById[id]))

    const directedVisited = new Set<string>()
    const queue = [...selectedNodeIds]
    while (queue.length > 0) {
      const current = queue.pop()!
      for (const edge of edges) {
        if (edge.edge_type !== 'directed') continue
        if (edge.source_id !== current) continue
        if (directedVisited.has(edge.target_id) || selectedNodeIds.has(edge.target_id)) continue
        if (!nodesById[edge.target_id]) continue
        directedVisited.add(edge.target_id)
        queue.push(edge.target_id)
      }
    }

    const simpleVisited = new Set<string>()
    for (const edge of edges) {
      if (edge.edge_type !== 'simple') continue
      if (selectedNodeIds.has(edge.source_id) && !selectedNodeIds.has(edge.target_id) && !directedVisited.has(edge.target_id)) {
        simpleVisited.add(edge.target_id)
      }
      if (selectedNodeIds.has(edge.target_id) && !selectedNodeIds.has(edge.source_id) && !directedVisited.has(edge.source_id)) {
        simpleVisited.add(edge.source_id)
      }
    }

    return { directedConnectedIds: directedVisited, simpleConnectedIds: simpleVisited }
  }, [edges, selectedIds, nodesById])

  const handleTransform = useCallback(() => {
    const selectedArr = [...useCanvasStore.getState().selectedIds]
    if (selectedArr.length !== 1) return
    const id = selectedArr[0]
    const group = nodeGroupRefs.get(id)
    if (!group) return

    const node = useCanvasStore.getState().nodes[id]
    if (!node) return

    // Read group position BEFORE resetting scale — Transformer shifts x/y when
    // resizing from top-left/top-right/bottom-left corners to keep the opposite
    // corner fixed. Stale node.x/y in the store would cause wrong edge centers.
    const newX = group.x()
    const newY = group.y()
    const newW = Math.max(80, Math.round(node.width * group.scaleX()))
    const newH = Math.max(60, Math.round(node.height * group.scaleY()))
    group.scaleX(1)
    group.scaleY(1)

    updateNode(id, { x: newX, y: newY, width: newW, height: newH })

    // Imperatively update connected edges — same pattern as cluster drag,
    // avoids React render lag between Transformer visual update and EdgeLine re-render
    const newCx = newX + newW / 2
    const newCy = newY + newH / 2
    const { edges, nodes } = useCanvasStore.getState()
    for (const edge of Object.values(edges)) {
      if (edge.source_id !== id && edge.target_id !== id) continue
      const updateFn = edgeUpdateFns.get(edge.id)
      if (!updateFn) continue
      const other = nodes[edge.source_id === id ? edge.target_id : edge.source_id]
      if (!other) continue
      const ox = other.x + other.width / 2
      const oy = other.y + other.height / 2
      const isSource = edge.source_id === id
      updateFn(isSource ? newCx : ox, isSource ? newCy : oy, isSource ? ox : newCx, isSource ? oy : newCy)
    }
    group.getStage()?.batchDraw()
  }, [updateNode])

  const handleTransformEnd = useCallback(() => {
    const selectedArr = [...useCanvasStore.getState().selectedIds]
    if (selectedArr.length !== 1) return
    const id = selectedArr[0]
    const group = nodeGroupRefs.get(id)
    const node = useCanvasStore.getState().nodes[id]
    if (!node || !group) return

    // Guard: if onTransform was skipped for the final frame, flush scale now.
    // Also read group x/y — Transformer may have shifted position for corner resizes.
    const finalX = group.x()
    const finalY = group.y()
    const finalW = Math.max(80, Math.round(node.width * group.scaleX()))
    const finalH = Math.max(60, Math.round(node.height * group.scaleY()))
    group.scaleX(1)
    group.scaleY(1)

    updateNode(id, { x: finalX, y: finalY, width: finalW, height: finalH })
    updateNodeApi(id, { x: finalX, y: finalY, width: finalW, height: finalH }).catch(console.error)
  }, [updateNode])

  const handleDragStart = useCallback((id: string) => {
    const { selectedIds, nodes } = useCanvasStore.getState()
    if (selectedIds.size > 1 && selectedIds.has(id)) {
      const positions = new Map<string, { x: number; y: number }>()
      for (const sid of selectedIds) {
        if (nodes[sid]) positions.set(sid, { x: nodes[sid].x, y: nodes[sid].y })
      }
      multiDragInitialPositions.current = positions
    } else {
      multiDragInitialPositions.current = null
    }
  }, [])

  const handleDragMove = useCallback((id: string, x: number, y: number) => {
    const initPositions = multiDragInitialPositions.current
    if (initPositions?.has(id)) {
      const init = initPositions.get(id)!
      const dx = x - init.x
      const dy = y - init.y

      // Move other selected Groups imperatively
      for (const [otherId, initPos] of initPositions) {
        if (otherId === id) continue
        const group = nodeGroupRefs.get(otherId)
        if (group) group.position({ x: initPos.x + dx, y: initPos.y + dy })
      }

      // Update edges imperatively — same pattern as cluster drag
      const { nodes: nodesMap, edges: edgesMap } = useCanvasStore.getState()
      for (const edge of Object.values(edgesMap)) {
        const updateFn = edgeUpdateFns.get(edge.id)
        if (!updateFn) continue
        const srcInSel = initPositions.has(edge.source_id)
        const tgtInSel = initPositions.has(edge.target_id)
        if (!srcInSel && !tgtInSel) continue
        const srcNode = nodesMap[edge.source_id]
        const tgtNode = nodesMap[edge.target_id]
        if (!srcNode || !tgtNode) continue
        const srcInit = initPositions.get(edge.source_id)
        const tgtInit = initPositions.get(edge.target_id)
        const sx = (srcInSel ? (edge.source_id === id ? x : (srcInit!.x + dx)) : srcNode.x) + srcNode.width / 2
        const sy = (srcInSel ? (edge.source_id === id ? y : (srcInit!.y + dy)) : srcNode.y) + srcNode.height / 2
        const tx = (tgtInSel ? (edge.target_id === id ? x : (tgtInit!.x + dx)) : tgtNode.x) + tgtNode.width / 2
        const ty = (tgtInSel ? (edge.target_id === id ? y : (tgtInit!.y + dy)) : tgtNode.y) + tgtNode.height / 2
        updateFn(sx, sy, tx, ty)
      }

      nodeGroupRefs.get(id)?.getStage()?.batchDraw()
    } else {
      updateNode(id, { x, y })
    }
  }, [updateNode])

  const handleDragEnd = useCallback((id: string, x: number, y: number) => {
    const initPositions = multiDragInitialPositions.current
    if (initPositions?.has(id)) {
      const init = initPositions.get(id)!
      const dx = x - init.x
      const dy = y - init.y
      const updates = Array.from(initPositions).map(([nodeId, initPos]) => ({
        id: nodeId,
        x: nodeId === id ? x : initPos.x + dx,
        y: nodeId === id ? y : initPos.y + dy,
      }))
      multiDragInitialPositions.current = null
      moveNodes(updates)
      const { canvasId } = useCanvasStore.getState()
      batchUpdateNodePositions(canvasId, updates).catch(console.error)
    } else {
      updateNode(id, { x, y })
    }
  }, [updateNode, moveNodes])

  const handleDblClick = useCallback((id: string) => {
    setEditingNodeId(id)
  }, [setEditingNodeId])

  const handleClick = useCallback((id: string, e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button !== 0) return
    const current = useCanvasStore.getState().selectedIds
    if (e.evt.shiftKey) {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      setSelectedIds(Array.from(next))
    } else {
      if (current.has(id)) {
        const next = new Set(current)
        next.delete(id)
        setSelectedIds(Array.from(next))
      } else {
        setSelectedIds([id])
      }
    }
  }, [setSelectedIds])

  const handleStartClusterDrag = useCallback((nodeId: string, e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage()
    if (!stage) return

    const { nodes: nodesMap, edges: edgesMap } = useCanvasStore.getState()
    const allEdges = Object.values(edgesMap)

    // BFS through all edges (both directions) to find the full connected component
    const visited = new Set<string>()
    const queue = [nodeId]
    visited.add(nodeId)
    while (queue.length > 0) {
      const current = queue.pop()!
      for (const edge of allEdges) {
        const neighbor =
          edge.source_id === current ? edge.target_id
          : edge.target_id === current ? edge.source_id
          : null
        if (neighbor && !visited.has(neighbor) && nodesMap[neighbor]) {
          visited.add(neighbor)
          queue.push(neighbor)
        }
      }
    }

    const clusterIds = [...visited]
    const initialPositions = new Map(
      clusterIds.map((id) => [id, { x: nodesMap[id].x, y: nodesMap[id].y }])
    )

    // Convert client coords → canvas coords using current viewport
    const rect = stage.container().getBoundingClientRect()
    const toCanvas = (clientX: number, clientY: number) => {
      const vp = useCanvasStore.getState().viewport
      return {
        x: (clientX - rect.left - vp.x) / vp.z,
        y: (clientY - rect.top - vp.y) / vp.z,
      }
    }

    const startPos = toCanvas(e.evt.clientX, e.evt.clientY)

    const onMouseMove = (ev: MouseEvent) => {
      const pos = toCanvas(ev.clientX, ev.clientY)
      const dx = pos.x - startPos.x
      const dy = pos.y - startPos.y

      // Move node Konva groups directly — zero React renders during drag
      const livePositions = new Map<string, { x: number; y: number }>()
      let stage: Konva.Stage | null = null

      for (const id of clusterIds) {
        const group = nodeGroupRefs.get(id)
        if (!group) continue
        const init = initialPositions.get(id)!
        const nx = init.x + dx
        const ny = init.y + dy
        group.position({ x: nx, y: ny })
        livePositions.set(id, { x: nx, y: ny })
        if (!stage) stage = group.getStage()
      }

      // Update edges imperatively — no React, no store reads
      const { nodes: nodesMap, edges: edgesMap } = useCanvasStore.getState()
      for (const edge of Object.values(edgesMap)) {
        const updateFn = edgeUpdateFns.get(edge.id)
        if (!updateFn) continue

        const srcLive = livePositions.get(edge.source_id)
        const tgtLive = livePositions.get(edge.target_id)
        if (!srcLive && !tgtLive) continue // edge unrelated to cluster

        const srcNode = nodesMap[edge.source_id]
        const tgtNode = nodesMap[edge.target_id]
        if (!srcNode || !tgtNode) continue

        const sx = (srcLive ? srcLive.x : srcNode.x) + srcNode.width / 2
        const sy = (srcLive ? srcLive.y : srcNode.y) + srcNode.height / 2
        const tx = (tgtLive ? tgtLive.x : tgtNode.x) + tgtNode.width / 2
        const ty = (tgtLive ? tgtLive.y : tgtNode.y) + tgtNode.height / 2

        updateFn(sx, sy, tx, ty)
      }

      // One redraw for all layers
      stage?.batchDraw()
    }

    const onMouseUp = (ev: MouseEvent) => {
      // Commit final positions to store in one batch (edges snap, React syncs)
      const pos = toCanvas(ev.clientX, ev.clientY)
      const dx = pos.x - startPos.x
      const dy = pos.y - startPos.y
      moveNodes(
        clusterIds.map((id) => {
          const init = initialPositions.get(id)!
          return { id, x: init.x + dx, y: init.y + dy }
        })
      )
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [moveNodes])

  const handleStartConnect = useCallback((nodeId: string, edgeType: 'simple' | 'directed') => {
    connectingFromId.current = nodeId
    connectingEdgeType.current = edgeType
    const node = useCanvasStore.getState().nodes[nodeId]
    if (!node) return
    const cx = node.x + node.width / 2
    const cy = node.y + node.height / 2
    setPreviewLine([cx, cy, cx, cy])
  }, [])

  const handleLayerMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!connectingFromId.current || !previewLine) return
    const stage = e.target.getStage()
    if (!stage) return
    const pos = stage.getPointerPosition()
    if (!pos) return
    const scale = stage.scaleX()
    const stagePos = stage.position()
    const canvasX = (pos.x - stagePos.x) / scale
    const canvasY = (pos.y - stagePos.y) / scale
    setPreviewLine([previewLine[0], previewLine[1], canvasX, canvasY])
  }

  const handleLayerMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!connectingFromId.current) return
    const sourceId = connectingFromId.current
    const edgeType = connectingEdgeType.current
    connectingFromId.current = null
    connectingEdgeType.current = 'simple'
    setPreviewLine(null)

    const stage = e.target.getStage()
    if (!stage) return
    const pos = stage.getPointerPosition()
    if (!pos) return
    const scale = stage.scaleX()
    const stagePos = stage.position()
    const canvasX = (pos.x - stagePos.x) / scale
    const canvasY = (pos.y - stagePos.y) / scale

    const storeNodes = useCanvasStore.getState().nodes
    const targetNode = Object.values(storeNodes).find(
      (node) =>
        canvasX >= node.x &&
        canvasX <= node.x + node.width &&
        canvasY >= node.y &&
        canvasY <= node.y + node.height &&
        node.id !== sourceId
    )

    if (targetNode) {
      const store = useCanvasStore.getState()
      createEdge(store.canvasId, sourceId, targetNode.id, edgeType)
        .then((edge) => store.addEdge(edge))
        .catch(console.error)
    }
  }

  return (
    <Layer
      onMouseMove={handleLayerMouseMove}
      onMouseUp={handleLayerMouseUp}
      onContextMenu={(e) => e.evt.preventDefault()}
    >
      {previewLine && (
        <Line
          points={previewLine}
          stroke="#7c3aed"
          strokeWidth={1.5}
          dash={[6, 4]}
          listening={false}
        />
      )}
      {nodeIds.map((id) => (
        <NoteCard
          key={id}
          nodeId={id}
          isSelected={selectedIds.has(id)}
          isDirectedConnected={directedConnectedIds.has(id)}
          isSimpleConnected={simpleConnectedIds.has(id)}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDoubleClick={handleDblClick}
          onClick={handleClick}
          onStartConnect={handleStartConnect}
          onStartClusterDrag={handleStartClusterDrag}
        />
      ))}
      <Transformer
        ref={transformerRef}
        rotateEnabled={false}
        keepRatio={false}
        borderEnabled={false}
        enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
        anchorSize={10}
        anchorStyleFunc={(anchor) => { anchor.opacity(0) }}
        boundBoxFunc={(oldBox, newBox) => ({
          ...newBox,
          width: Math.max(80, newBox.width),
          height: Math.max(60, newBox.height),
        })}
        onTransform={handleTransform}
        onTransformEnd={handleTransformEnd}
      />
    </Layer>
  )
}
