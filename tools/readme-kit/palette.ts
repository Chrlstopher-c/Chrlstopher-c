/**
 * Palette commune du kit README (bannières + diagrammes), alignée sur la bannière du profil.
 * Fonts système uniquement : un SVG servi en <img> par GitHub ne charge aucune webfont.
 */
export interface Theme {
  key: 'dark' | 'light'
  ground0: string
  ground1: string
  border: string
  accent: string
  accentSoft: string
  title: string
  text: string
  muted: string
  faint: string
  box: string
  boxBorder: string
  ok: string
}

export const THEMES: Theme[] = [
  {
    key: 'dark',
    ground0: '#0a0b0e',
    ground1: '#0e1014',
    border: '#20242c',
    accent: '#d8a35f',
    accentSoft: '#d8a35f',
    title: '#f4f1ea',
    text: '#c3cad3',
    muted: '#8b929c',
    faint: '#4b525c',
    box: '#161b22',
    boxBorder: '#2a313c',
    ok: '#4ac97e',
  },
  {
    key: 'light',
    ground0: '#ffffff',
    ground1: '#f6f8fa',
    border: '#d0d7de',
    accent: '#9a6b1f',
    accentSoft: '#d8a35f',
    title: '#1f2328',
    text: '#3b4149',
    muted: '#59636e',
    faint: '#a0a8b1',
    box: '#ffffff',
    boxBorder: '#d0d7de',
    ok: '#1a7f37',
  },
]

export const MONO = "ui-monospace,'SF Mono',Consolas,monospace"
export const SERIF = "Georgia,'Times New Roman',serif"
export const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"

export const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Découpe aux espaces en lignes d'au plus `max` caractères. */
export function wrap(text: string, max: number): string[] {
  const lines: string[] = []
  let cur = ''
  for (const w of text.split(' ')) {
    if ((cur + ' ' + w).trim().length > max) {
      if (cur) lines.push(cur)
      cur = w
    } else cur = (cur + ' ' + w).trim()
  }
  if (cur) lines.push(cur)
  return lines
}
