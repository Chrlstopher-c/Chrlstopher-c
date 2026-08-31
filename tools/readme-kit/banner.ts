/**
 * Bannière README d'un projet (dark + light), même langage visuel que la bannière du profil.
 * Usage : bun run banner.ts <spec.json> <dossier-sortie>
 * Spec : { name, eyebrow, tagline, tags[], repo, mark? }  — mark ∈ shield|mesh|layers|waves|phone|grid
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { THEMES, MONO, SERIF, esc, wrap, type Theme } from './palette.ts'

interface BannerSpec {
  name: string
  eyebrow: string
  tagline: string
  tags: string[]
  repo: string
  mark?: 'shield' | 'mesh' | 'layers' | 'waves' | 'phone' | 'grid'
}

const W = 1200
const H = 300

function mark(kind: BannerSpec['mark'], t: Theme): string {
  const a = t.accentSoft
  const f = t.faint
  const ox = 960
  const oy = 150
  switch (kind) {
    case 'shield':
      return `<path d="M${ox} ${oy - 70} l62 24 v58 c0 42 -34 70 -62 84 c-28 -14 -62 -42 -62 -84 v-58 z"
        fill="none" stroke="${a}" stroke-width="2.5" opacity="0.9"/>
        <path d="M${ox - 24} ${oy - 2} l16 16 l34 -36" fill="none" stroke="${a}" stroke-width="3" stroke-linecap="round"/>`
    case 'mesh': {
      const pts = [[-70, -40], [40, -60], [80, 20], [10, 70], [-60, 40], [0, 0]]
      const lines = [[0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [0, 1], [1, 2], [2, 3], [3, 4], [4, 0]]
      return lines.map(([i, j]) => `<line x1="${ox + pts[i][0]}" y1="${oy + pts[i][1]}" x2="${ox + pts[j][0]}" y2="${oy + pts[j][1]}" stroke="${f}" stroke-width="1.2"/>`).join('')
        + pts.map(([x, y], i) => `<circle cx="${ox + x}" cy="${oy + y}" r="${i === 5 ? 7 : 5}" fill="${i === 5 ? a : t.ground1}" stroke="${a}" stroke-width="2"/>`).join('')
    }
    case 'layers':
      return [0, 1, 2].map((i) => `<path d="M${ox - 70} ${oy - 30 + i * 28} l70 -34 l70 34 l-70 34 z" fill="none" stroke="${i === 1 ? a : f}" stroke-width="2"/>`).join('')
    case 'waves':
      return [0, 1, 2, 3].map((i) => `<path d="M${ox - 80} ${oy - 36 + i * 24} q20 -16 40 0 t40 0 t40 0 t40 0" fill="none" stroke="${i === 1 ? a : f}" stroke-width="2" stroke-linecap="round"/>`).join('')
    case 'phone':
      return `<rect x="${ox - 38}" y="${oy - 78}" width="76" height="156" rx="14" fill="none" stroke="${a}" stroke-width="2.5"/>
        <rect x="${ox - 14}" y="${oy - 70}" width="28" height="5" rx="2.5" fill="${f}"/>
        ${[0, 1, 2].map((i) => `<rect x="${ox - 26}" y="${oy - 46 + i * 30}" width="52" height="18" rx="4" fill="none" stroke="${f}" stroke-width="1.5"/>`).join('')}`
    case 'grid':
      return [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => `<rect x="${ox - 66 + c * 46}" y="${oy - 66 + r * 46}" width="40" height="40" rx="6" fill="none" stroke="${r === 1 && c === 1 ? a : f}" stroke-width="${r === 1 && c === 1 ? 2.5 : 1.5}"/>`)).join('')
    default:
      return ''
  }
}

function pills(tags: string[], t: Theme, y: number): string {
  let x = 72
  return tags
    .map((tag) => {
      const w = tag.length * 7.6 + 22
      const el = `<rect x="${x}" y="${y - 15}" width="${w}" height="22" rx="11" fill="${t.box}" stroke="${t.boxBorder}"/>
        <text x="${x + w / 2}" y="${y}" text-anchor="middle" font-family="${MONO}" font-size="11.5" fill="${t.muted}">${esc(tag)}</text>`
      x += w + 8
      return el
    })
    .join('')
}

function banner(s: BannerSpec, t: Theme): string {
  const tagline = wrap(s.tagline, 72)
  const id = `b-${t.key}`
  const nameSize = s.name.length > 12 ? 52 : 62
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" role="img" aria-label="${esc(s.name)} — ${esc(s.tagline)}">
  <defs>
    <linearGradient id="${id}-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.ground0}"/><stop offset="1" stop-color="${t.ground1}"/></linearGradient>
    <radialGradient id="${id}-h" cx="0.8" cy="0.5" r="0.5"><stop offset="0" stop-color="${t.accentSoft}" stop-opacity="0.14"/><stop offset="1" stop-color="${t.accentSoft}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="16" fill="url(#${id}-g)"/>
  <rect width="${W}" height="${H}" rx="16" fill="url(#${id}-h)"/>
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="15" stroke="${t.border}" stroke-width="1.5"/>
  <g transform="translate(72,66)">
    <rect x="0" y="-11" width="26" height="2" rx="1" fill="${t.accentSoft}"/>
    <text x="40" y="-5" font-family="${MONO}" font-size="13" letter-spacing="3" fill="${t.muted}">${esc(s.eyebrow.toUpperCase())}</text>
  </g>
  <text x="70" y="140" font-family="${SERIF}" font-size="${nameSize}" font-weight="600" fill="${t.title}" letter-spacing="0.5">${esc(s.name)}</text>
  <line x1="72" y1="160" x2="300" y2="160" stroke="${t.accentSoft}" stroke-width="2" stroke-linecap="round"/>
  ${tagline.map((l, i) => `<text x="72" y="${196 + i * 26}" font-family="${MONO}" font-size="17" fill="${t.text}">${esc(l)}</text>`).join('')}
  ${pills(s.tags, t, 262)}
  <g opacity="0.9">${mark(s.mark, t)}</g>
  <text x="1128" y="280" text-anchor="end" font-family="${MONO}" font-size="12" fill="${t.faint}">github.com/chrlstopher-c/${esc(s.repo)}</text>
</svg>`
}

const [specPath, outDir] = process.argv.slice(2)
if (!specPath || !outDir) throw new Error('usage: bun run banner.ts <spec.json> <out-dir>')
const spec = JSON.parse(readFileSync(specPath, 'utf8')) as BannerSpec
mkdirSync(outDir, { recursive: true })
for (const t of THEMES) writeFileSync(join(outDir, `banner-${t.key}.svg`), banner(spec, t))
console.log(`OK — banner ${spec.repo} × dark/light → ${outDir}`)
