/**
 * Diagramme « how it works » d'un README (dark + light) à partir d'une spec déclarative.
 * Usage : bun run diagram.ts <spec.json> <dossier-sortie> [nom-de-fichier]
 * Spec : { w, h, groups[], nodes[], edges[] }
 *   group : { x, y, w, h, label }
 *   node  : { id, x, y, w, h, title, sub?, accent? }
 *   edge  : { from, to, label?, dashed?, both? }
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { THEMES, MONO, SANS, esc, type Theme } from './palette.ts'

interface Group { x: number; y: number; w: number; h: number; label: string }
interface Node { id: string; x: number; y: number; w: number; h: number; title: string; sub?: string; accent?: boolean }
interface Edge { from: string; to: string; label?: string; dashed?: boolean; both?: boolean }
interface Spec { w: number; h: number; groups?: Group[]; nodes: Node[]; edges: Edge[] }

type Pt = { x: number; y: number }

/** Point d'ancrage sur le bord d'un nœud, dans la direction de `to`. */
function anchor(n: Node, to: Pt): Pt {
  const cx = n.x + n.w / 2
  const cy = n.y + n.h / 2
  const dx = to.x - cx
  const dy = to.y - cy
  if (dx === 0 && dy === 0) return { x: cx, y: cy }
  const sx = dx === 0 ? Infinity : n.w / 2 / Math.abs(dx)
  const sy = dy === 0 ? Infinity : n.h / 2 / Math.abs(dy)
  const s = Math.min(sx, sy)
  return { x: cx + dx * s, y: cy + dy * s }
}

const center = (n: Node): Pt => ({ x: n.x + n.w / 2, y: n.y + n.h / 2 })

function group(g: Group, t: Theme): string {
  return `<rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="14" fill="${t.ground1}" stroke="${t.border}" stroke-dasharray="4 4"/>
  <text x="${g.x + 14}" y="${g.y + 20}" font-family="${MONO}" font-size="11" letter-spacing="2" fill="${t.muted}">${esc(g.label.toUpperCase())}</text>`
}

function node(n: Node, t: Theme): string {
  const cx = n.x + n.w / 2
  const stroke = n.accent ? t.accentSoft : t.boxBorder
  const titleY = n.sub ? n.y + n.h / 2 - 4 : n.y + n.h / 2 + 5
  const sub = n.sub
    ? `<text x="${cx}" y="${n.y + n.h / 2 + 15}" text-anchor="middle" font-family="${MONO}" font-size="11" fill="${t.muted}">${esc(n.sub)}</text>`
    : ''
  return `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="10" fill="${t.box}" stroke="${stroke}" stroke-width="${n.accent ? 2 : 1.2}"/>
  <text x="${cx}" y="${titleY}" text-anchor="middle" font-family="${SANS}" font-size="14" font-weight="600" fill="${t.title}">${esc(n.title)}</text>${sub}`
}

/** Étiquette d'arête sur un fond opaque, pour rester lisible par-dessus le trait. */
function edgeLabel(text: string, x: number, y: number, t: Theme): string {
  const w = text.length * 6.6 + 12
  return `<rect x="${x - w / 2}" y="${y - 9}" width="${w}" height="18" rx="9" fill="${t.ground0}" stroke="${t.border}"/>
  <text x="${x}" y="${y + 4}" text-anchor="middle" font-family="${MONO}" font-size="10.5" fill="${t.muted}">${esc(text)}</text>`
}

function edge(e: Edge, byId: Map<string, Node>, t: Theme, mk: string): string {
  const a = byId.get(e.from)
  const b = byId.get(e.to)
  if (!a || !b) throw new Error(`edge inconnue: ${e.from} → ${e.to}`)
  const p = anchor(a, center(b))
  const q = anchor(b, center(a))
  const dash = e.dashed ? ' stroke-dasharray="5 5"' : ''
  const start = e.both ? ` marker-start="url(#${mk}-r)"` : ''
  const label = e.label ? edgeLabel(e.label, (p.x + q.x) / 2, (p.y + q.y) / 2, t) : ''
  return `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="${t.muted}" stroke-width="1.4"${dash} marker-end="url(#${mk})"${start}/>${label}`
}

function render(s: Spec, t: Theme): string {
  const byId = new Map(s.nodes.map((n) => [n.id, n]))
  const mk = `arrow-${t.key}`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s.w}" height="${s.h}" viewBox="0 0 ${s.w} ${s.h}" fill="none" role="img">
  <defs>
    <marker id="${mk}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${t.muted}"/></marker>
    <marker id="${mk}-r" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M10 0 L0 5 L10 10 z" fill="${t.muted}"/></marker>
  </defs>
  <rect width="${s.w}" height="${s.h}" rx="16" fill="${t.ground0}" stroke="${t.border}"/>
  ${(s.groups ?? []).map((g) => group(g, t)).join('\n  ')}
  ${s.edges.map((e) => edge(e, byId, t, mk)).join('\n  ')}
  ${s.nodes.map((n) => node(n, t)).join('\n  ')}
</svg>`
}

const [specPath, outDir, base = 'how-it-works'] = process.argv.slice(2)
if (!specPath || !outDir) throw new Error('usage: bun run diagram.ts <spec.json> <out-dir> [base]')
const spec = JSON.parse(readFileSync(specPath, 'utf8')) as Spec
mkdirSync(outDir, { recursive: true })
for (const t of THEMES) writeFileSync(join(outDir, `${base}-${t.key}.svg`), render(spec, t))
console.log(`OK — diagramme ${base} × dark/light → ${outDir}`)
