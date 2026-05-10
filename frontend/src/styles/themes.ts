export type ThemeName = 'dark' | 'light' | 'matrix'

export interface Theme {
  canvasBg: string
  nodeBg: string
  nodeBorder: string
  nodeText: string
  accent: string       // selected node border, connection handles, selected edge
  shadow: string       // rgba shadow string for Konva shadowColor
  edgeDefault: string  // unselected, unhighlighted edge color
}

export const THEMES: Record<ThemeName, Theme> = {
  dark: {
    canvasBg: '#0d0d0d',
    nodeBg: '#1a1a2e',
    nodeBorder: '#2a2a3a',
    nodeText: '#e2e8f0',
    accent: '#7c3aed',
    shadow: 'rgba(0,0,0,0.35)',
    edgeDefault: '#4a4a6a',
  },
  light: {
    canvasBg: '#f4f0e8',
    nodeBg: '#d1d5db',
    nodeBorder: '#9ca3af',
    nodeText: '#1a1a2e',
    accent: '#7c3aed',
    shadow: 'rgba(0,0,0,0.12)',
    edgeDefault: '#9ca3af',
  },
  matrix: {
    canvasBg: '#000000',
    nodeBg: '#0a1a0a',
    nodeBorder: '#1a3a1a',
    nodeText: '#00ff41',
    accent: '#00ff41',
    shadow: 'rgba(0,255,65,0.2)',
    edgeDefault: '#1a5c1a',
  },
}

export const THEME_ORDER: ThemeName[] = ['dark', 'light', 'matrix']

const STORAGE_KEY = 'canvas_theme'

export function loadTheme(): ThemeName {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'dark' || stored === 'light' || stored === 'matrix') return stored
  return 'dark'
}

export function saveTheme(theme: ThemeName): void {
  localStorage.setItem(STORAGE_KEY, theme)
}
