/**
 * Frise d'étapes (installation, utilisation, désinstallation) — dark + light.
 * Usage : bun run steps.ts <spec.json> <dossier-sortie> <base>
 * Spec : { title?, steps: [{ title, cmd?, note? }] }   (4 étapes par rangée maximum)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { THEMES, MONO, SANS, esc, wrap, type Theme } from './palette.ts'

interface Step { title: string; cmd?: string; note?: string }
interface Spec { title?: string; steps: Step[] }

const W = 1040
const GAP = 24
const PAD = 30

const noteLinesOf = (s: Step, w: number): string[] => (s.note ? wrap(s.note, Math.floor(w / 6.4)).slice(0, 3) : [])

function cardHeight(s: Step, w: number): number {
  return 44 + (s.cmd ? 36 : 0) + noteLinesOf(s, w).length * 15 + 14
}

function card(s: Step, i: number, x: number, y: number, w: number, h: number, t: Theme): string {
  const noteLines = noteLinesOf(s, w)
  const cmd = s.cmd
    ? `<rect x="${x + 14}" y="${y + 52}" width="${w - 28}" height="24" rx="6" fill="${t.ground0}" stroke="${t.border}"/>
    <text x="${x + 24}" y="${y + 68}" font-family="${MONO}" font-size="11.5" fill="${t.accent}">${esc(s.cmd)}</text>`
    : ''
  const noteY = s.cmd ? y + 94 : y + 60
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${t.box}" stroke="${t.boxBorder}"/>
  <circle cx="${x + 26}" cy="${y + 26}" r="13" fill="${t.accentSoft}"/>
  <text x="${x + 26}" y="${y + 31}" text-anchor="middle" font-family="${MONO}" font-size="13" font-weight="700" fill="${t.ground0}">${i + 1}</text>
  <text x="${x + 48}" y="${y + 31}" font-family="${SANS}" font-size="14.5" font-weight="600" fill="${t.title}">${esc(s.title)}</text>
  ${cmd}
  ${noteLines.map((l, k) => `<text x="${x + 14}" y="${noteY + k * 15}" font-family="${SANS}" font-size="11.5" fill="${t.muted}">${esc(l)}</text>`).join('')}`
}

function arrow(x: number, y: number, t: Theme): string {
  return `<path d="M${x} ${y} l${GAP - 8} 0" stroke="${t.muted}" stroke-width="1.4" marker-end="url(#stp-${t.key})"/>`
}

/** 4 colonnes pour des étapes courtes, 2 dès qu'une commande ou une note est longue. */
function columnsFor(steps: Step[]): number {
  const longest = Math.max(...steps.map((s) => Math.max(s.cmd?.length ?? 0, Math.ceil((s.note?.length ?? 0) / 2))))
  return steps.length <= 2 ? steps.length : longest > 30 ? 2 : 4
}

function render(s: Spec, t: Theme): string {
  const perRow = columnsFor(s.steps)
  const rows = Math.ceil(s.steps.length / perRow)
  const cardW = (W - 2 * PAD - GAP * (perRow - 1)) / perRow
  const cardH = Math.max(...s.steps.map((st) => cardHeight(st, cardW)))
  const top = s.title ? 56 : 24
  const H = top + rows * cardH + (rows - 1) * GAP + 24
  const cards = s.steps.map((st, i) => {
    const r = Math.floor(i / perRow)
    const c = i % perRow
    const x = PAD + c * (cardW + GAP)
    const y = top + r * (cardH + GAP)
    const a = c < perRow - 1 && i < s.steps.length - 1 ? arrow(x + cardW + 4, y + 26, t) : ''
    return card(st, i, x, y, cardW, cardH, t) + a
  })
  const title = s.title
    ? `<text x="${PAD}" y="36" font-family="${MONO}" font-size="12" letter-spacing="2.5" fill="${t.muted}">${esc(s.title.toUpperCase())}</text>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" role="img">
  <defs><marker id="stp-${t.key}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="${t.muted}"/></marker></defs>
  <rect width="${W}" height="${H}" rx="16" fill="${t.ground0}" stroke="${t.border}"/>
  ${title}
  ${cards.join('\n  ')}
</svg>`
}

const [specPath, outDir, base] = process.argv.slice(2)
if (!specPath || !outDir || !base) throw new Error('usage: bun run steps.ts <spec.json> <out-dir> <base>')
const spec = JSON.parse(readFileSync(specPath, 'utf8')) as Spec
if (spec.steps.length === 0) throw new Error('spec sans étapes')
mkdirSync(outDir, { recursive: true })
for (const t of THEMES) writeFileSync(join(outDir, `${base}-${t.key}.svg`), render(spec, t))
console.log(`OK — étapes ${base} × dark/light → ${outDir}`)
