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
      repositories: {
        totalCount: number
        nodes: {
          isPrivate: boolean
          primaryLanguage: { name: string; color: string } | null
          languages: { edges: { size: number; node: { name: string; color: string } }[] }
        }[]
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

// Langages par VOLUME de code réel (bytes), agrégés sur les repos publics.
// On exclut les repos de config/rice/desktop : leur QML/code n'est pas du dev
// applicatif écrit par Chris (Ambxst embarqué, dotfiles) et fausse le portrait.
const LANG_EXCLUDE_REPOS = new Set(['echo-os', 'ProfileArch', 'animated-wallpaper-hyprland', 'trinity-dotfiles'])
const BYTES_PER_LINE = 42 // estimation moyenne pour convertir bytes → lignes
const bytesByLang = new Map<string, { size: number; color: string }>()
for (const n of u.repositories.nodes) {
  if (n.isPrivate || LANG_EXCLUDE_REPOS.has(n.name)) continue
  for (const e of n.languages?.edges ?? []) {
    const cur = bytesByLang.get(e.node.name) ?? { size: 0, color: e.node.color }
    cur.size += e.size
    bytesByLang.set(e.node.name, cur)
  }
}
const totalBytes = [...bytesByLang.values()].reduce((s, e) => s + e.size, 0) || 1

// Repo le plus massif pour chaque langage.
const langRepo = new Map<string, Map<string, number>>()
for (const n of u.repositories.nodes) {
  if (n.isPrivate || LANG_EXCLUDE_REPOS.has(n.name)) continue
  for (const e of n.languages?.edges ?? []) {
    const m = langRepo.get(e.node.name) ?? new Map<string, number>()
    m.set(n.name, (m.get(n.name) ?? 0) + e.size)
    langRepo.set(e.node.name, m)
  }
}
const topRepo = (lang: string): string => [...(langRepo.get(lang)?.entries() ?? [])].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''

const langs = [...bytesByLang.entries()]
  .map(([name, e]) => ({ name, pct: (100 * e.size) / totalBytes, lines: Math.round(e.size / BYTES_PER_LINE), color: e.color || '#888', repo: topRepo(name) }))
  .sort((a, b) => b.pct - a.pct)
  .slice(0, 6)
const langCount = bytesByLang.size
const nf = (n: number): string => n.toLocaleString('en')
const fmtK = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`)

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
    198,
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
        `<circle cx="32" cy="${86 + i * 18}" r="4.5" fill="${l.color}"/>
         <text x="46" y="${90 + i * 18}" font-family="${MONO}" font-size="12" fill="${t.strong}">${l.name}</text>
         <text x="214" y="${90 + i * 18}" text-anchor="end" font-family="${MONO}" font-size="11.5" fill="${t.text}">${l.pct.toFixed(1)}%</text>
         <text x="296" y="${90 + i * 18}" text-anchor="end" font-family="${MONO}" font-size="11" fill="${t.muted}">~${fmtK(l.lines)}</text>
         <text x="414" y="${90 + i * 18}" text-anchor="end" font-family="${MONO}" font-size="11" fill="${l.color}">${l.repo}</text>`
    )
    .join('')
  return shell(
    t,
    440,
    198,
    `<text x="26" y="40" font-family="${MONO}" font-size="12" letter-spacing="1.5" fill="${t.muted}">LANGUAGES · BY CODE VOLUME</text>
     ${bar}${list}
     <text x="46" y="72" font-family="${MONO}" font-size="9.5" fill="${t.dim}">language</text>
     <text x="214" y="72" text-anchor="end" font-family="${MONO}" font-size="9.5" fill="${t.dim}">%</text>
     <text x="296" y="72" text-anchor="end" font-family="${MONO}" font-size="9.5" fill="${t.dim}">~lines</text>
     <text x="414" y="72" text-anchor="end" font-family="${MONO}" font-size="9.5" fill="${t.dim}">top repo</text>`
  )
}

for (const t of THEMES) {
  writeFileSync(new URL(`./out/stats-${t.key}.svg`, import.meta.url), statsCard(t))
  writeFileSync(new URL(`./out/langs-${t.key}.svg`, import.meta.url), langsCard(t))
}
console.log(`OK — stats/langs en dark+light. commits=${commits} contrib=${totalContrib} repos=${repos} public=${publicRepos} langs=${langCount}`)
