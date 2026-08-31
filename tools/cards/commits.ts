/**
 * Card "top projets ce mois-ci" : part de commits du mois courant par projet.
 * dark + light, style épuré (barres ambre unifiées, % mis en avant).
 */
import { readFileSync, writeFileSync } from 'node:fs'

interface Theme {
  key: 'dark' | 'light'
  card0: string
  card1: string
  border: string
  text: string
  muted: string
  dim: string
  accent: string
  accent2: string
  track: string
}
const THEMES: Theme[] = [
  { key: 'dark', card0: '#161b22', card1: '#11151b', border: '#2a313c', text: '#e9edf1', muted: '#8b929c', dim: '#5b636e', accent: '#e0b579', accent2: '#c98b3f', track: '#1c2129' },
  { key: 'light', card0: '#ffffff', card1: '#f6f8fa', border: '#d0d7de', text: '#1f2328', muted: '#59636e', dim: '#8b949e', accent: '#9a6b1f', accent2: '#b8842f', track: '#eaeef2' },
]
const MONO = "ui-monospace,'SF Mono',Consolas,monospace"

interface Raw {
  data: { user: { repositories: { nodes: RepoNode[] } } }
}
interface RepoNode {
  name: string
  isPrivate: boolean
  defaultBranchRef: { target: { history: { totalCount: number } } | null } | null
}

// Exclus : repo profil lui-même, jeux, expérimentations, tests.
const BLOCKLIST = new Set(['Primordia', 'Chrlstopher-c'])
const isExcluded = (n: string): boolean => BLOCKLIST.has(n) || /(-|^)(test|demo|game|hello)s?($|-)/i.test(n)

const raw = JSON.parse(readFileSync(new URL('./out/raw.json', import.meta.url), 'utf8')) as Raw
const all = raw.data.user.repositories.nodes
  .filter((r) => !r.isPrivate && !isExcluded(r.name) && r.defaultBranchRef?.target?.history)
  .map((r) => ({ name: r.name, commits: r.defaultBranchRef!.target!.history.totalCount }))
  .filter((r) => r.commits > 0)
const monthTotal = all.reduce((s, r) => s + r.commits, 0) || 1
const repos = all.sort((a, b) => b.commits - a.commits).slice(0, 6)
const maxC = Math.max(...repos.map((r) => r.commits), 1)
const monthName = new Date().toLocaleString('en-US', { month: 'long', timeZone: 'UTC' }).toUpperCase()
const year = new Date().getUTCFullYear()

const W = 860
const rowTop = 84
const rowH = 37
const H = rowTop + repos.length * rowH + 2
const barX = 180
const barMax = 420

function svg(t: Theme): string {
  const gid = `bar-${t.key}`
  const bgid = `bg-${t.key}`
  const rows = repos
    .map((r, i) => {
      const y = rowTop + i * rowH
      const w = Math.max((barMax * r.commits) / maxC, 4)
      const pct = ((100 * r.commits) / monthTotal).toFixed(1)
      return `<text x="30" y="${y + 4}" font-family="${MONO}" font-size="13.5" fill="${t.text}">${r.name}</text>
        <rect x="${barX}" y="${y - 4}" width="${barMax}" height="7" rx="3.5" fill="${t.track}"/>
        <rect x="${barX}" y="${y - 4}" width="${w}" height="7" rx="3.5" fill="url(#${gid})"/>
        <text x="${barX + barMax + 18}" y="${y + 5}" font-family="${MONO}" font-size="14.5" font-weight="700" fill="${t.accent}">${pct}%</text>
        <text x="${W - 30}" y="${y + 4}" text-anchor="end" font-family="${MONO}" font-size="12" fill="${t.dim}">${r.commits} commits</text>`
    })
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
  <defs>
    <linearGradient id="${bgid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.card0}"/><stop offset="1" stop-color="${t.card1}"/></linearGradient>
    <linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${t.accent2}"/><stop offset="1" stop-color="${t.accent}"/></linearGradient>
  </defs>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12" fill="url(#${bgid})" stroke="${t.border}"/>
  <rect x="0.5" y="0.5" width="${W - 1}" height="2.5" rx="1" fill="${t.accent}"/>
  <text x="30" y="42" font-family="${MONO}" font-size="14" font-weight="700" letter-spacing="0.5" fill="${t.text}">Top projects</text>
  <text x="${W - 30}" y="42" text-anchor="end" font-family="${MONO}" font-size="12" letter-spacing="1.5" fill="${t.muted}">${monthName} ${year} · SHARE OF COMMITS</text>
  <line x1="30" y1="58" x2="${W - 30}" y2="58" stroke="${t.border}"/>
  ${rows}
</svg>`
}

for (const t of THEMES) writeFileSync(new URL(`./out/commits-${t.key}.svg`, import.meta.url), svg(t))
console.log(`OK — top projets ${monthName} ${year}:`, repos.map((r) => `${r.name} ${((100 * r.commits) / monthTotal).toFixed(1)}%`).join(' · '))
