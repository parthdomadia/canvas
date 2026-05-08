import { describe, it, expect, beforeEach } from 'vitest'
import { useCanvasStore } from '../canvasStore'
import type { CanvasNode } from '@/types'

const mockNode: CanvasNode = {
  id: 'node-1',
  canvas_id: 'canvas-1',
  content: 'Hello',
  x: 100,
  y: 200,
  width: 200,
  height: 120,
  color: 'default',
  z_index: 0,
}

beforeEach(() => {
  useCanvasStore.setState({
    canvasId: '',
    nodes: {},
    edges: {},
    viewport: { x: 0, y: 0, z: 1 },
    selectedIds: new Set(),
    toolMode: 'select',
    connectingFrom: null,
    editingNodeId: null,
  })
})

describe('hydrateCanvas', () => {
  it('populates nodes and edges from arrays', () => {
    useCanvasStore.getState().hydrateCanvas('canvas-1', [mockNode], [], { x: 0, y: 0, z: 1 })
    const { nodes, canvasId } = useCanvasStore.getState()
    expect(canvasId).toBe('canvas-1')
    expect(nodes['node-1']).toEqual(mockNode)
  })
})

describe('addNode', () => {
  it('adds a node to the store', () => {
    useCanvasStore.getState().addNode(mockNode)
    expect(useCanvasStore.getState().nodes['node-1']).toEqual(mockNode)
  })
})

describe('updateNode', () => {
  it('patches only specified fields', () => {
    useCanvasStore.getState().addNode(mockNode)
    useCanvasStore.getState().updateNode('node-1', { content: 'Updated', x: 150 })
    const node = useCanvasStore.getState().nodes['node-1']
    expect(node.content).toBe('Updated')
    expect(node.x).toBe(150)
    expect(node.y).toBe(200)
  })
})

describe('deleteNode', () => {
  it('removes the node from the store', () => {
    useCanvasStore.getState().addNode(mockNode)
    useCanvasStore.getState().deleteNode('node-1')
    expect(useCanvasStore.getState().nodes['node-1']).toBeUndefined()
  })

  it('removes edges connected to the deleted node', () => {
    useCanvasStore.setState({
      nodes: { 'node-1': mockNode, 'node-2': { ...mockNode, id: 'node-2' } },
      edges: {
        'edge-1': {
          id: 'edge-1',
          canvas_id: 'canvas-1',
          source_id: 'node-1',
          target_id: 'node-2',
          label: null,
          style: 'solid',
        },
      },
    })
    useCanvasStore.getState().deleteNode('node-1')
    expect(useCanvasStore.getState().edges['edge-1']).toBeUndefined()
  })
})

describe('setSelectedIds', () => {
  it('stores selected IDs as a Set', () => {
    useCanvasStore.getState().setSelectedIds(['node-1', 'node-2'])
    expect(useCanvasStore.getState().selectedIds.has('node-1')).toBe(true)
    expect(useCanvasStore.getState().selectedIds.has('node-2')).toBe(true)
  })
})
