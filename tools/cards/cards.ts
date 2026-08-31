/**
 * github-cards — génère des cartes SVG à partir des vraies données GitHub.
 * Fonts : uniquement des familles système (Georgia/Consolas), car un SVG servi
 * comme <img> sur GitHub ne charge aucune webfont. DA : dark premium, accent ambre.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const ACCENT = '#d8a35f'
const ACCENT_SOFT = '#e0b579'
const TEXT = '#e9edf1'
const MUTED = '#8b929c'
const DIM = '#5b636e'
const BG = '#0d1117'
const BORDER = '#2a313c'
const SERIF = "Georgia,'Times New Roman',serif"
const MONO = "ui-monospace,'SF Mono',Consolas,monospace"

interface Raw {
  data: {
    user: {
      contributionsCollection: {
        totalCommitContributions: number
        contributionCalendar: {
          totalContributions: number
          weeks: { contributionDays: { date: string; contributionCount: number }[] }[]
        }
      }
      repositories: {
        totalCount: number
        nodes: { isPrivate: boolean; primaryLanguage: { name: string; color: string } | null }[]
      }
    }
  }
}

const raw = JSON.parse(readFileSync(new URL('./out/raw.json', import.meta.url), 'utf8')) as Raw
const u = raw.data.user
const commits = u.contributionsCollection.totalCommitContributions
const totalContrib = u.contributionsCollection.contributionCalendar.totalContributions
const repos = u.repositories.totalCount
const publicRepos = u.repositories.nodes.filter((n) => !n.isPrivate).length

// top langs
const counter = new Map<string, { n: number; color: string }>()
for (const n of u.repositories.nodes) {
  const pl = n.primaryLanguage
  if (!pl) continue
  const e = counter.get(pl.name) ?? { n: 0, color: pl.color }
  e.n++
  counter.set(pl.name, e)
}
const langTotal = [...counter.values()].reduce((s, e) => s + e.n, 0)
const langs = [...counter.entries()]
  .map(([name, e]) => ({ name, pct: (100 * e.n) / langTotal, color: e.color || ACCENT }))
  .sort((a, b) => b.pct - a.pct)
  .slice(0, 5)
const langCount = counter.size

const shell = (w: number, h: number, inner: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">
  <defs><linearGradient id="cardbg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#161b22"/><stop offset="1" stop-color="#11151b"/></linearGradient></defs>
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="12" fill="url(#cardbg)" stroke="${BORDER}"/>
  <rect x="0.5" y="0.5" width="${w - 1}" height="2.5" rx="1" fill="${ACCENT}"/>
  ${inner}
</svg>`

// ── carte activité ──
const statsCard = shell(
  440,
  175,
  `<text x="26" y="40" font-family="${MONO}" font-size="12" letter-spacing="1.5" fill="${MUTED}">ACTIVITY · LAST 12 MONTHS</text>
   <text x="26" y="104" font-family="${SERIF}" font-size="62" font-weight="600" fill="${ACCENT}">${commits.toLocaleString('en')}</text>
   <text x="${26 + String(commits.toLocaleString('en')).length * 37 + 14}" y="104" font-family="${MONO}" font-size="15" fill="${TEXT}">commits</text>
   <text x="26" y="140" font-family="${MONO}" font-size="13.5" fill="#c1c9d2">${totalContrib.toLocaleString('en')} contributions</text>
   <line x1="26" y1="150" x2="414" y2="150" stroke="${BORDER}"/>
   <text x="26" y="166" font-family="${MONO}" font-size="12.5" fill="${MUTED}">${repos} repos · ${publicRepos} public · ${langCount} languages</text>`
)

// ── carte langages ──
let x = 26
const barW = 388
const bar = langs
  .map((l) => {
    const w = (barW * l.pct) / 100
    const seg = `<rect x="${x}" y="52" width="${Math.max(w - 2, 2)}" height="9" rx="2" fill="${l.color}"/>`
    x += w
    return seg
  })
  .join('')
const list = langs
  .map(
    (l, i) =>
      `<circle cx="32" cy="${86 + i * 17}" r="4.5" fill="${l.color}"/>
       <text x="46" y="${90 + i * 17}" font-family="${MONO}" font-size="12.5" fill="#c1c9d2">${l.name}</text>
       <text x="414" y="${90 + i * 17}" text-anchor="end" font-family="${MONO}" font-size="12.5" fill="${MUTED}">${l.pct.toFixed(1)}%</text>`
  )
  .join('')
const langsCard = shell(
  440,
  175,
  `<text x="26" y="40" font-family="${MONO}" font-size="12" letter-spacing="1.5" fill="${MUTED}">MOST USED LANGUAGES</text>
   ${bar}${list}`
)

// ── graphe de contributions (calendrier réel) ──
const days: { date: string; c: number }[] = []
for (const w of u.contributionsCollection.contributionCalendar.weeks)
  for (const d of w.contributionDays) days.push({ date: d.date, c: d.contributionCount })
const maxC = Math.max(...days.map((d) => d.c), 1)
const scale = (c: number): string => {
  if (c === 0) return '#1c222b'
  const t = c / maxC
  if (t > 0.66) return ACCENT
  if (t > 0.33) return '#a9793f'
  return '#5c472b'
}
const cell = 12
const gap = 3
let cx = 26
let cy = 46
let col = 0
let cells = ''
const weeks = u.contributionsCollection.contributionCalendar.weeks
weeks.forEach((w, wi) => {
  w.contributionDays.forEach((d, di) => {
    cells += `<rect x="${26 + wi * (cell + gap)}" y="${46 + di * (cell + gap)}" width="${cell}" height="${cell}" rx="2.5" fill="${scale(d.contributionCount)}"/>`
  })
})
const graphW = 26 + weeks.length * (cell + gap) + 26
const contribCard = shell(
  graphW,
  180,
  `<text x="26" y="34" font-family="${MONO}" font-size="12" letter-spacing="1.5" fill="${MUTED}">CONTRIBUTIONS · LAST 12 MONTHS</text>
   ${cells}
   <text x="26" y="172" font-family="${MONO}" font-size="11.5" fill="${DIM}">${totalContrib.toLocaleString('en')} contributions in the last year — bursts of deep focus</text>`
)

writeFileSync(new URL('./out/stats.svg', import.meta.url), statsCard)
writeFileSync(new URL('./out/langs.svg', import.meta.url), langsCard)
writeFileSync(new URL('./out/contrib.svg', import.meta.url), contribCard)
console.log('OK — stats.svg, langs.svg, contrib.svg générés dans out/')
console.log(`commits=${commits} contrib=${totalContrib} repos=${repos} public=${publicRepos} langs=${langCount}`)
