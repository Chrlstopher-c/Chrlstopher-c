/**
 * Génère une carte SVG par projet (dark + light) : nom, description, tags.
 * Reproduit le style des cards du profil. Fonts système uniquement.
 */
import { writeFileSync } from 'node:fs'

interface Proj {
  slug: string
  name: string
  desc: string
  tags: string[]
}
const PROJECTS: Proj[] = [
  { slug: 'aegis', name: 'aegis', desc: 'Real-time Linux EDR antivirus, 100% local. Hybrid YARA + eBPF detection.', tags: ['Rust', 'eBPF', 'YARA'] },
  { slug: 'ccremote', name: 'ccremote', desc: 'Remote-control harness for Claude Code — drive AI coding agents from any device, real-time task & quota arbitration.', tags: ['TypeScript', 'WebSocket'] },
  { slug: 'nullnode', name: 'nullnode', desc: 'Sovereign P2P encrypted messaging — WebRTC + blind relay, zero-knowledge.', tags: ['TypeScript', 'WebRTC'] },
  { slug: 'echohub-v2', name: 'echohub-v2', desc: 'Local LLM manager — GGUF + AWQ/GPTQ, HuggingFace browser, persistent chat.', tags: ['TypeScript', 'Python'] },
  { slug: 'vela', name: 'vela', desc: 'Linux file manager with an integrated code editor.', tags: ['Tauri', 'React'] },
  { slug: 'vigie', name: 'vigie', desc: 'Native iOS client for ccremote — SwiftUI, compiled on Arch Linux via xtool.', tags: ['Swift', 'SwiftUI'] },
]

interface Theme {
  key: 'dark' | 'light'
  card0: string
  card1: string
  border: string
  name: string
  desc: string
  tagbg: string
  tagbd: string
  tagtx: string
}
const THEMES: Theme[] = [
  { key: 'dark', card0: '#161b22', card1: '#12161c', border: '#2a313c', name: '#e0b579', desc: '#c1c9d2', tagbg: '#0f141a', tagbd: '#21262d', tagtx: '#8b929c' },
  { key: 'light', card0: '#ffffff', card1: '#f6f8fa', border: '#d0d7de', name: '#9a6b1f', desc: '#3b4149', tagbg: '#f6f8fa', tagbd: '#d0d7de', tagtx: '#59636e' },
]

const MONO = "ui-monospace,'SF Mono',Consolas,monospace"
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"
const W = 460

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Découpe le texte en lignes d'au plus `max` caractères (coupe aux espaces). */
function wrap(text: string, max: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max) {
      if (cur) lines.push(cur)
      cur = w
    } else cur = (cur + ' ' + w).trim()
  }
  if (cur) lines.push(cur)
  return lines
}

/** Largeur approx d'un tag (char mono ~7px + padding). */
const tagW = (s: string): number => s.length * 7.2 + 20

function card(p: Proj, t: Theme): string {
  const descLines = wrap(p.desc, 48)
  const descTop = 66
  const H = 158 // hauteur uniforme pour aligner les cards côte à côte
  const tagsY = H - 34 // tags ancrés en bas
  const id = `g-${p.slug}-${t.key}`

  let tx = 24
  const tags = p.tags
    .map((tag) => {
      const w = tagW(tag)
      const el = `<rect x="${tx}" y="${tagsY}" width="${w}" height="22" rx="11" fill="${t.tagbg}" stroke="${t.tagbd}"/>
        <text x="${tx + w / 2}" y="${tagsY + 15}" text-anchor="middle" font-family="${MONO}" font-size="11" fill="${t.tagtx}">${esc(tag)}</text>`
      tx += w + 8
      return el
    })
    .join('')

  const desc = descLines
    .map((l, i) => `<text x="24" y="${descTop + i * 19}" font-family="${SANS}" font-size="13" fill="${t.desc}">${esc(l)}</text>`)
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
  <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${t.card0}"/><stop offset="1" stop-color="${t.card1}"/></linearGradient></defs>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12" fill="url(#${id})" stroke="${t.border}"/>
  <text x="24" y="38" font-family="${MONO}" font-size="15" font-weight="700" fill="${t.name}">${esc(p.name)}</text>
  ${desc}${tags}
</svg>`
}

for (const p of PROJECTS)
  for (const t of THEMES)
    writeFileSync(new URL(`./out/proj-${p.slug}-${t.key}.svg`, import.meta.url), card(p, t))
console.log('OK — cards projets:', PROJECTS.map((p) => p.slug).join(', '), '× dark/light')
