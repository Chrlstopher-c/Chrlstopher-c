/**
 * Tuiles à grand chiffre (benchmarks mesurés, grosses dépendances) — dark + light.
 * Usage : bun run tiles.ts <spec.json> <dossier-sortie> <base>
 * Spec : { title?, tiles: [{ value, unit?, label, sub? }] }   (3 ou 4 tuiles par rangée)
 * Règle : une tuile = une mesure faite, avec sa source dans `sub`. Rien d'inventé.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { THEMES, MONO, SANS, SERIF, esc, wrap, type Theme } from './palette.ts'

interface Tile { value: string; unit?: string; label: string; sub?: string }
interface Spec { title?: string; tiles: Tile[] }

const W = 1040
const PAD = 30
const GAP = 20
const TILE_H = 152

function tile(tl: Tile, x: number, y: number, w: number, t: Theme): string {
  const valueSize = tl.value.length > 6 ? 30 : 38
  const unit = tl.unit ? `<tspan font-size="16" fill="${t.muted}"> ${esc(tl.unit)}</tspan>` : ''
  const label = wrap(tl.label, Math.floor(w / 6.9)).slice(0, 2)
  const sub = tl.sub ? wrap(tl.sub, Math.floor(w / 7.4)).slice(0, 2) : []
  return `<rect x="${x}" y="${y}" width="${w}" height="${TILE_H}" rx="12" fill="${t.box}" stroke="${t.boxBorder}"/>
  <text x="${x + 18}" y="${y + 50}" font-family="${SERIF}" font-size="${valueSize}" font-weight="600" fill="${t.title}">${esc(tl.value)}${unit}</text>
  ${label.map((l, i) => `<text x="${x + 18}" y="${y + 76 + i * 17}" font-family="${SANS}" font-size="13" fill="${t.text}">${esc(l)}</text>`).join('')}
  ${sub.map((l, i) => `<text x="${x + 18}" y="${y + 116 + i * 15}" font-family="${MONO}" font-size="10.5" fill="${t.muted}">${esc(l)}</text>`).join('')}`
}

function render(s: Spec, t: Theme): string {
  const perRow = s.tiles.length <= 3 ? s.tiles.length : 4
  const rows = Math.ceil(s.tiles.length / perRow)
  const w = (W - 2 * PAD - GAP * (perRow - 1)) / perRow
  const top = s.title ? 56 : 24
  const H = top + rows * TILE_H + (rows - 1) * GAP + 24
  const tiles = s.tiles.map((tl, i) => {
    const x = PAD + (i % perRow) * (w + GAP)
    const y = top + Math.floor(i / perRow) * (TILE_H + GAP)
    return tile(tl, x, y, w, t)
  })
  const title = s.title
    ? `<text x="${PAD}" y="36" font-family="${MONO}" font-size="12" letter-spacing="2.5" fill="${t.muted}">${esc(s.title.toUpperCase())}</text>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" role="img">
  <rect width="${W}" height="${H}" rx="16" fill="${t.ground0}" stroke="${t.border}"/>
  ${title}
  ${tiles.join('\n  ')}
</svg>`
}

const [specPath, outDir, base] = process.argv.slice(2)
if (!specPath || !outDir || !base) throw new Error('usage: bun run tiles.ts <spec.json> <out-dir> <base>')
const spec = JSON.parse(readFileSync(specPath, 'utf8')) as Spec
if (spec.tiles.length === 0) throw new Error('spec sans tuiles')
mkdirSync(outDir, { recursive: true })
for (const t of THEMES) writeFileSync(join(outDir, `${base}-${t.key}.svg`), render(spec, t))
console.log(`OK — tuiles ${base} × dark/light → ${outDir}`)
