/**
 * Carte des fichiers importants (binaire, service, config, données, logs) — dark + light.
 * Usage : bun run filemap.ts <spec.json> <dossier-sortie> [base]
 * Spec : { groups: [{ label, entries: [{ path, role, kind? }] }] }   kind ∈ file|dir|socket|log|port|rule|agent
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { THEMES, MONO, SANS, esc, type Theme } from './palette.ts'

interface Entry { path: string; role: string; kind?: 'file' | 'dir' | 'socket' | 'log' | 'port' | 'rule' | 'agent' }
interface Group { label: string; entries: Entry[] }
interface Spec { groups: Group[] }

const W = 1040
const PAD = 30
const ROW = 30
const HEAD = 34
const GROUP_GAP = 18

function glyph(kind: Entry['kind'], x: number, y: number, t: Theme): string {
  const c = t.accentSoft
  switch (kind) {
    case 'dir':
      return `<path d="M${x} ${y - 9} h7 l3 3 h10 v12 h-20 z" fill="none" stroke="${c}" stroke-width="1.4"/>`
    case 'socket':
      return `<circle cx="${x + 10}" cy="${y - 2}" r="6" fill="none" stroke="${c}" stroke-width="1.4"/><circle cx="${x + 10}" cy="${y - 2}" r="2" fill="${c}"/>`
    case 'log':
      return `<path d="M${x + 2} ${y - 9} h14 v16 h-14 z M${x + 5} ${y - 4} h8 M${x + 5} ${y} h8 M${x + 5} ${y + 4} h5" fill="none" stroke="${c}" stroke-width="1.4"/>`
    case 'port':
      return `<path d="M${x + 2} ${y - 6} h16 M${x + 2} ${y - 1} h16 M${x + 2} ${y + 4} h10" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>`
    case 'rule':
      return `<path d="M${x + 10} ${y - 10} l8 3 v7 c0 5 -4 9 -8 11 c-4 -2 -8 -6 -8 -11 v-7 z" fill="none" stroke="${c}" stroke-width="1.4"/>`
    case 'agent':
      return `<rect x="${x + 2}" y="${y - 8}" width="16" height="14" rx="4" fill="none" stroke="${c}" stroke-width="1.4"/><circle cx="${x + 7}" cy="${y - 2}" r="1.4" fill="${c}"/><circle cx="${x + 13}" cy="${y - 2}" r="1.4" fill="${c}"/>`
    default:
      return `<path d="M${x + 3} ${y - 9} h9 l5 5 v11 h-14 z" fill="none" stroke="${c}" stroke-width="1.4"/>`
  }
}

function group(g: Group, y: number, t: Theme): { svg: string; h: number } {
  const h = HEAD + g.entries.length * ROW + 12
  const rows = g.entries.map((e, i) => {
    const ry = y + HEAD + i * ROW + 18
    return `${glyph(e.kind, PAD + 16, ry, t)}
    <text x="${PAD + 46}" y="${ry + 3}" font-family="${MONO}" font-size="12.5" fill="${t.title}">${esc(e.path)}</text>
    <text x="${PAD + 470}" y="${ry + 3}" font-family="${SANS}" font-size="12.5" fill="${t.text}">${esc(e.role)}</text>`
  })
  return {
    h,
    svg: `<rect x="${PAD}" y="${y}" width="${W - 2 * PAD}" height="${h}" rx="12" fill="${t.box}" stroke="${t.boxBorder}"/>
  <text x="${PAD + 16}" y="${y + 22}" font-family="${MONO}" font-size="11" letter-spacing="2.5" fill="${t.muted}">${esc(g.label.toUpperCase())}</text>
  ${rows.join('\n  ')}`,
  }
}

function render(s: Spec, t: Theme): string {
  let y = 24
  const parts: string[] = []
  for (const g of s.groups) {
    const r = group(g, y, t)
    parts.push(r.svg)
    y += r.h + GROUP_GAP
  }
  const H = y - GROUP_GAP + 24
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" role="img">
  <rect width="${W}" height="${H}" rx="16" fill="${t.ground0}" stroke="${t.border}"/>
  ${parts.join('\n  ')}
</svg>`
}

const [specPath, outDir, base = 'files'] = process.argv.slice(2)
if (!specPath || !outDir) throw new Error('usage: bun run filemap.ts <spec.json> <out-dir> [base]')
const spec = JSON.parse(readFileSync(specPath, 'utf8')) as Spec
mkdirSync(outDir, { recursive: true })
for (const t of THEMES) writeFileSync(join(outDir, `${base}-${t.key}.svg`), render(spec, t))
console.log(`OK — carte des fichiers ${base} × dark/light → ${outDir}`)
