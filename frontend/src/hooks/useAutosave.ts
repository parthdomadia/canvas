import { useEffect, useRef } from 'react'
import { useCanvasStore } from '@/store/canvasStore'
import { updateNode as apiUpdateNode } from '@/api/nodes'
import type { CanvasNode } from '@/types'

const DEBOUNCE_MS = 500

export function useAutosave() {
  const nodes = useCanvasStore((s) => s.nodes)
  const canvasId = useCanvasStore((s) => s.canvasId)

  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const prevNodes = useRef<Record<string, CanvasNode>>({})

  useEffect(() => {
    if (!canvasId) return

    const prev = prevNodes.current

    for (const node of Object.values(nodes)) {
      const p = prev[node.id]
      if (!p) continue

      // content is intentionally excluded — NodeEditor saves it directly on close
      const changed =
        p.x !== node.x ||
        p.y !== node.y ||
        p.width !== node.width ||
        p.height !== node.height ||
        p.color !== node.color

      if (!changed) continue

      const existing = timers.current.get(node.id)
      if (existing) clearTimeout(existing)

      const capturedNode = { ...node }
      const timer = setTimeout(() => {
        apiUpdateNode(capturedNode.id, {
          x: capturedNode.x,
          y: capturedNode.y,
          width: capturedNode.width,
          height: capturedNode.height,
          color: capturedNode.color,
        }).catch(console.error)
        timers.current.delete(capturedNode.id)
      }, DEBOUNCE_MS)

      timers.current.set(node.id, timer)
    }

    prevNodes.current = nodes
  }, [nodes, canvasId])

  useEffect(() => {
    return () => { timers.current.forEach((timer) => clearTimeout(timer)) }
  }, [])
}
