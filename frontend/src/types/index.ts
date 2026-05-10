export interface CanvasNode {
  id: string
  canvas_id: string
  content: string
  x: number
  y: number
  width: number
  height: number
  color: string
  z_index: number
  font_size: number
}

export interface CanvasEdge {
  id: string
  canvas_id: string
  source_id: string
  target_id: string
  label: string | null
  style: 'solid' | 'dashed' | 'dotted'
  edge_type: 'simple' | 'directed'
}

export interface Viewport {
  x: number
  y: number
  z: number
}

export interface CanvasData {
  id: string
  title: string
  viewport: Viewport
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

export type ToolMode = 'select' | 'connect' | 'pan'
