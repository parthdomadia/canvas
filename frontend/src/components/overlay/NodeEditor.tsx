import { useState, useRef, useEffect, useCallback } from 'react'
import type { CanvasNode, Viewport } from '@/types'
import { canvasToScreen } from '@/utils/coordinates'
import { updateNode as apiUpdateNode } from '@/api/nodes'
import { useCanvasStore } from '@/store/canvasStore'
import { applyBulletSpace, applyBulletEnter } from '@/utils/editorBullets'

interface NodeEditorProps {
  node: CanvasNode
  viewport: Viewport
  onClose: () => void
}

export function NodeEditor({ node, viewport, onClose }: NodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const closedRef = useRef(false)
  const [content, setContent] = useState(node.content)
  const updateNode = useCanvasStore((s) => s.updateNode)
  const pos = canvasToScreen(node.x, node.y, viewport)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return

    let velocity = 0
    let rafId: number | null = null

    function animate() {
      if (!el) return
      const step = velocity * 0.12
      el.scrollTop += step
      velocity -= step
      if (Math.abs(velocity) < 0.5) {
        velocity = 0
        rafId = null
        return
      }
      rafId = requestAnimationFrame(animate)
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault()
      e.stopPropagation()
      velocity += e.deltaY
      if (rafId === null) {
        rafId = requestAnimationFrame(animate)
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [])

  const save = useCallback(() => {
    updateNode(node.id, { content })
    apiUpdateNode(node.id, { content }).catch(console.error)
  }, [node.id, content, updateNode])

  const handleBlur = useCallback(() => {
    if (closedRef.current) return
    closedRef.current = true
    save()
    onClose()
  }, [save, onClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      e.stopPropagation()
      const el = textareaRef.current
      if (!el) return

      // Font size: Ctrl+Shift+< (decrease) or Ctrl+Shift+> (increase)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === '<' || e.key === '>')) {
        e.preventDefault()
        const delta = e.key === '>' ? 1 : -1
        const newSize = Math.min(48, Math.max(8, node.font_size + delta))
        updateNode(node.id, { font_size: newSize })
        apiUpdateNode(node.id, { font_size: newSize }).catch(console.error)
        return
      }

      // Exit: Escape saves and closes
      if (e.key === 'Escape') {
        e.preventDefault()
        closedRef.current = true
        save()
        onClose()
        return
      }

      // Bullet: Space may transform "- " to "• "
      if (e.key === ' ') {
        const result = applyBulletSpace(el.value, el.selectionStart)
        if (result) {
          e.preventDefault()
          setContent(result.value)
          requestAnimationFrame(() => {
            el.setSelectionRange(result.cursor, result.cursor)
          })
          return
        }
      }

      // Bullet: Enter continues or deactivates bullet
      if (e.key === 'Enter') {
        const result = applyBulletEnter(el.value, el.selectionStart)
        if (result) {
          e.preventDefault()
          setContent(result.value)
          requestAnimationFrame(() => {
            el.setSelectionRange(result.cursor, result.cursor)
          })
          return
        }
        // Non-bullet line: let default textarea behaviour insert a newline
      }
    },
    [node.id, node.font_size, save, onClose, updateNode],
  )

  return (
    <textarea
      ref={textareaRef}
      className="node-editor app-scrollable"
      value={content}
      onChange={(e) => setContent(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: node.width * viewport.z,
        height: node.height * viewport.z,
        padding: `${12 * viewport.z}px`,
        fontSize: `${node.font_size * viewport.z}px`,
        fontFamily: "'Alpino', system-ui, -apple-system, sans-serif",
        lineHeight: 1.5,
        background: 'var(--node-bg, #1a1a2e)',
        color: 'var(--node-text, #e2e8f0)',
        border: '2px solid var(--node-border-selected, #7c3aed)',
        borderRadius: `${8 * viewport.z}px`,
        resize: 'none',
        outline: 'none',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        overflowY: 'auto',
        zIndex: 10,
        boxShadow: '0 0 0 4px rgba(124, 58, 237, 0.15)',
      }}
    />
  )
}
