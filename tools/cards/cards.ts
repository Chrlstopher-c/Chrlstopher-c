/**
 * github-cards — génère les cartes SVG (stats + langages) en thème dark ET light,
 * à partir des vraies données GitHub (out/raw.json). Fonts système uniquement
 * (un SVG servi comme <img> sur GitHub ne charge aucune webfont).
 */
import { readFileSync, writeFileSync } from 'node:fs'

interface Theme {
  key: 'dark' | 'light'
  card0: string
  card1: string
  border: string
  text: string
  strong: string
  muted: string
  dim: string
  accent: string
}
const THEMES: Theme[] = [
  { key: 'dark', card0: '#161b22', card1: '#11151b', border: '#2a313c', text: '#e9edf1', strong: '#c1c9d2', muted: '#8b929c', dim: '#5b636e', accent: '#d8a35f' },
  { key: 'light', card0: '#ffffff', card1: '#f6f8fa', border: '#d0d7de', text: '#1f2328', strong: '#3b4149', muted: '#59636e', dim: '#8b949e', accent: '#9a6b1f' },
]

const SERIF = "Georgia,'Times New Roman',serif"
const MONO = "ui-monospace,'SF Mono',Consolas,monospace"

interface Raw {
  data: {
    user: {
      contributionsCollection: { totalCommitContributions: number; contributionCalendar: { totalContributions: number } }
      repositories: { totalCount: number; nodes: { isPrivate: boolean; primaryLanguage: { name: string; color: string } | null }[] }
    }
  }
}

const raw = JSON.parse(readFileSync(new URL('./out/raw.json', import.meta.url), 'utf8')) as Raw
const u = raw.data.user
const commits = u.contributionsCollection.totalCommitContributions
const totalContrib = u.contributionsCollection.contributionCalendar.totalContributions
const repos = u.repositories.totalCount
const publicRepos = u.repositories.nodes.filter((n) => !n.isPrivate).length

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
  .map(([name, e]) => ({ name, pct: (100 * e.n) / langTotal, color: e.color || '#888' }))
  .sort((a, b) => b.pct - a.pct)
  .slice(0, 5)
const langCount = counter.size
const nf = (n: number): string => n.toLocaleString('en')

function shell(t: Theme, w: number, h: number, inner: string): string {
  const id = `bg-${t.key}`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">
  <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${t.card0}"/><stop offset="1" stop-color="${t.card1}"/></linearGradient></defs>
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="12" fill="url(#${id})" stroke="${t.border}"/>
  <rect x="0.5" y="0.5" width="${w - 1}" height="2.5" rx="1" fill="${t.accent}"/>
  ${inner}
</svg>`
}

function statsCard(t: Theme): string {
  const big = nf(commits)
  return shell(
    t,
    440,
    175,
    `<text x="26" y="40" font-family="${MONO}" font-size="12" letter-spacing="1.5" fill="${t.muted}">ACTIVITY · LAST 12 MONTHS</text>
     <text x="26" y="104" font-family="${SERIF}" font-size="62" font-weight="600" fill="${t.accent}">${big}</text>
     <text x="${26 + big.length * 37 + 14}" y="104" font-family="${MONO}" font-size="15" fill="${t.text}">commits</text>
     <text x="26" y="140" font-family="${MONO}" font-size="13.5" fill="${t.strong}">${nf(totalContrib)} contributions</text>
     <line x1="26" y1="150" x2="414" y2="150" stroke="${t.border}"/>
     <text x="26" y="166" font-family="${MONO}" font-size="12.5" fill="${t.muted}">${repos} repos · ${publicRepos} public · ${langCount} languages</text>`
  )
}

function langsCard(t: Theme): string {
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
         <text x="46" y="${90 + i * 17}" font-family="${MONO}" font-size="12.5" fill="${t.strong}">${l.name}</text>
         <text x="414" y="${90 + i * 17}" text-anchor="end" font-family="${MONO}" font-size="12.5" fill="${t.muted}">${l.pct.toFixed(1)}%</text>`
    )
    .join('')
  return shell(
    t,
    440,
    175,
    `<text x="26" y="40" font-family="${MONO}" font-size="12" letter-spacing="1.5" fill="${t.muted}">MOST USED LANGUAGES</text>
     ${bar}${list}`
  )
}

for (const t of THEMES) {
  writeFileSync(new URL(`./out/stats-${t.key}.svg`, import.meta.url), statsCard(t))
  writeFileSync(new URL(`./out/langs-${t.key}.svg`, import.meta.url), langsCard(t))
}
console.log(`OK — stats/langs en dark+light. commits=${commits} contrib=${totalContrib} repos=${repos} public=${publicRepos} langs=${langCount}`)
