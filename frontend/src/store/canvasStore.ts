import { create } from 'zustand'
import { temporal } from 'zundo'
import type { CanvasNode, CanvasEdge, Viewport, ToolMode } from '@/types'

interface CanvasState {
  canvasId: string
  nodes: Record<string, CanvasNode>
  edges: Record<string, CanvasEdge>
  viewport: Viewport
  selectedIds: Set<string>
  toolMode: ToolMode
  connectingFrom: string | null
  editingNodeId: string | null

  hydrateCanvas: (id: string, nodes: CanvasNode[], edges: CanvasEdge[], viewport: Viewport) => void
  addNode: (node: CanvasNode) => void
  updateNode: (id: string, patch: Partial<CanvasNode>) => void
  moveNodes: (updates: Array<{ id: string; x: number; y: number }>) => void
  deleteNode: (id: string) => void
  addEdge: (edge: CanvasEdge) => void
  deleteEdge: (id: string) => void
  setViewport: (viewport: Viewport) => void
  setSelectedIds: (ids: string[]) => void
  setToolMode: (mode: ToolMode) => void
  setConnectingFrom: (id: string | null) => void
  setEditingNodeId: (id: string | null) => void
}

export const useCanvasStore = create<CanvasState>()(
  temporal(
    (set) => ({
      canvasId: '',
      nodes: {},
      edges: {},
      viewport: { x: 0, y: 0, z: 1 },
      selectedIds: new Set(),
      toolMode: 'select' as ToolMode,
      connectingFrom: null,
      editingNodeId: null,

      hydrateCanvas: (id, nodes, edges, viewport) =>
        set({
          canvasId: id,
          nodes: Object.fromEntries(nodes.map((n) => [n.id, n])),
          edges: Object.fromEntries(edges.map((e) => [e.id, e])),
          viewport,
        }),

      addNode: (node) =>
        set((state) => ({ nodes: { ...state.nodes, [node.id]: node } })),

      updateNode: (id, patch) =>
        set((state) => ({
          nodes: { ...state.nodes, [id]: { ...state.nodes[id], ...patch } },
        })),

      moveNodes: (updates) =>
        set((state) => {
          const nodes = { ...state.nodes }
          for (const { id, x, y } of updates) {
            if (nodes[id]) nodes[id] = { ...nodes[id], x, y }
          }
          return { nodes }
        }),

      deleteNode: (id) =>
        set((state) => {
          const { [id]: _removed, ...remainingNodes } = state.nodes
          const edges = Object.fromEntries(
            Object.entries(state.edges).filter(
              ([, e]) => e.source_id !== id && e.target_id !== id,
            ),
          )
          return { nodes: remainingNodes, edges }
        }),

      addEdge: (edge) =>
        set((state) => ({ edges: { ...state.edges, [edge.id]: edge } })),

      deleteEdge: (id) =>
        set((state) => {
          const { [id]: _removed, ...rest } = state.edges
          return { edges: rest }
        }),

      setViewport: (viewport) => set({ viewport }),
      setSelectedIds: (ids) => set({ selectedIds: new Set(ids) }),
      setToolMode: (mode) => set({ toolMode: mode }),
      setConnectingFrom: (id) => set({ connectingFrom: id }),
      setEditingNodeId: (id) => set({ editingNodeId: id }),
    }),
    {
      // Only track nodes and edges in undo history
      partialize: (state) => ({ nodes: state.nodes, edges: state.edges }),
    },
  ),
)
