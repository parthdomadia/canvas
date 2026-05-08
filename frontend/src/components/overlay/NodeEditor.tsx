import { useRef, useEffect } from 'react'
import type { CanvasNode, Viewport } from '@/types'
import { canvasToScreen } from '@/utils/coordinates'

interface NodeEditorProps {
  node: CanvasNode
  viewport: Viewport
  onChange: (content: string) => void
  onClose: () => void
}

export function NodeEditor({ node, viewport, onChange, onClose }: NodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pos = canvasToScreen(node.x, node.y, viewport)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [])

  return (
    <textarea
      ref={textareaRef}
      value={node.content}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') { e.preventDefault(); onClose() }
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onClose() }
        e.stopPropagation()
      }}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: node.width * viewport.z,
        height: node.height * viewport.z,
        padding: `${12 * viewport.z}px`,
        fontSize: `${13 * viewport.z}px`,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        lineHeight: 1.5,
        background: 'var(--node-bg, #1a1a2e)',
        color: 'var(--node-text, #e2e8f0)',
        border: '2px solid var(--node-border-selected, #7c3aed)',
        borderRadius: `${8 * viewport.z}px`,
        resize: 'none',
        outline: 'none',
        boxSizing: 'border-box',
        overflow: 'hidden',
        zIndex: 10,
        boxShadow: '0 0 0 4px rgba(124, 58, 237, 0.15)',
      }}
    />
  )
}
