import { useEffect } from 'react'
import { useCanvasStore } from '@/store/canvasStore'
import { THEMES, type Theme } from '@/styles/themes'

export function useTheme(): Theme {
  const themeName = useCanvasStore((s) => s.theme)
  const t = THEMES[themeName]

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--canvas-bg', t.canvasBg)
    root.style.setProperty('--node-bg', t.nodeBg)
    root.style.setProperty('--node-border', t.nodeBorder)
    root.style.setProperty('--node-text', t.nodeText)
    root.style.setProperty('--accent', t.accent)
    root.style.setProperty('--node-border-selected', t.accent)
  }, [t])

  return t
}
