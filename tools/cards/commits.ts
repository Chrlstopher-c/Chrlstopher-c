/**
 * Génère la card "commits par projet" (barres horizontales, top repos publics),
 * dark + light, depuis out/raw.json. Couleur de barre = langage principal.
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
  track: string
}
const THEMES: Theme[] = [
  { key: 'dark', card0: '#161b22', card1: '#11151b', border: '#2a313c', text: '#e9edf1', muted: '#8b929c', dim: '#5b636e', accent: '#d8a35f', track: '#1c222b' },
  { key: 'light', card0: '#ffffff', card1: '#f6f8fa', border: '#d0d7de', text: '#1f2328', muted: '#59636e', dim: '#8b949e', accent: '#9a6b1f', track: '#eaeef2' },
]
const MONO = "ui-monospace,'SF Mono',Consolas,monospace"

interface Raw {
  data: { user: { repositories: { nodes: RepoNode[] } } }
}
interface RepoNode {
  name: string
  isPrivate: boolean
  primaryLanguage: { name: string; color: string } | null
  defaultBranchRef: { target: { history: { totalCount: number } } | null } | null
}

// Projets non "vitrine" à exclure de la card (jeux, expérimentations, tests).
const BLOCKLIST = new Set(['Primordia'])
const isExcluded = (name: string): boolean => BLOCKLIST.has(name) || /(-|^)(test|demo|game|hello)s?($|-)/i.test(name)

const raw = JSON.parse(readFileSync(new URL('./out/raw.json', import.meta.url), 'utf8')) as Raw
const repos = raw.data.user.repositories.nodes
  .filter((r) => !r.isPrivate && !isExcluded(r.name) && r.defaultBranchRef?.target?.history)
  .map((r) => ({ name: r.name, commits: r.defaultBranchRef!.target!.history.totalCount, color: r.primaryLanguage?.color || '#888' }))
  .sort((a, b) => b.commits - a.commits)
  .slice(0, 8)

const maxC = Math.max(...repos.map((r) => r.commits), 1)
const nf = (n: number): string => n.toLocaleString('en')

const W = 860
const rowH = 30
const top = 60
const H = top + repos.length * rowH + 16
const nameW = 150
const barX = 30 + nameW
const barMax = W - barX - 90

function svg(t: Theme): string {
  const id = `cm-${t.key}`
  const rows = repos
    .map((r, i) => {
      const y = top + i * rowH
      const w = Math.max((barMax * r.commits) / maxC, 3)
      return `<text x="30" y="${y + 5}" font-family="${MONO}" font-size="13" fill="${t.text}">${r.name}</text>
        <rect x="${barX}" y="${y - 9}" width="${barMax}" height="13" rx="6" fill="${t.track}"/>
        <rect x="${barX}" y="${y - 9}" width="${w}" height="13" rx="6" fill="${r.color}"/>
        <text x="${barX + barMax + 12}" y="${y + 4}" font-family="${MONO}" font-size="12.5" fill="${t.muted}">${nf(r.commits)}</text>`
    })
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
  <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${t.card0}"/><stop offset="1" stop-color="${t.card1}"/></linearGradient></defs>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12" fill="url(#${id})" stroke="${t.border}"/>
  <rect x="0.5" y="0.5" width="${W - 1}" height="2.5" rx="1" fill="${t.accent}"/>
  <text x="30" y="40" font-family="${MONO}" font-size="12" letter-spacing="1.5" fill="${t.muted}">COMMITS BY PROJECT · TOP PUBLIC REPOS</text>
  ${rows}
</svg>`
}

for (const t of THEMES) writeFileSync(new URL(`./out/commits-${t.key}.svg`, import.meta.url), svg(t))
console.log('OK — commits dark+light:', repos.map((r) => `${r.name}(${r.commits})`).join(' '))
