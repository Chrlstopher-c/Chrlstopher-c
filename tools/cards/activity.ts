/**
 * Génère la carte "Activity overview" (croix commits/issues/PR/review) en dark+light,
 * à partir des vraies données GitHub. Honnête : pour un solo builder, 100% commits.
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
  commit: string
  axis: string
}
const THEMES: Theme[] = [
  { key: 'dark', card0: '#161b22', card1: '#11151b', border: '#2a313c', text: '#e9edf1', muted: '#8b929c', dim: '#5b636e', accent: '#d8a35f', commit: '#3fb950', axis: '#2a313c' },
  { key: 'light', card0: '#ffffff', card1: '#f6f8fa', border: '#d0d7de', text: '#1f2328', muted: '#59636e', dim: '#8b949e', accent: '#9a6b1f', commit: '#1a7f37', axis: '#d0d7de' },
]

const MONO = "ui-monospace,'SF Mono',Consolas,monospace"
const SERIF = "Georgia,'Times New Roman',serif"

interface Raw {
  data: {
    user: {
      contributionsCollection: {
        totalCommitContributions: number
        totalIssueContributions: number
        totalPullRequestContributions: number
        totalPullRequestReviewContributions: number
        contributionCalendar: { totalContributions: number }
      }
    }
  }
}
const cc = (JSON.parse(readFileSync(new URL('./out/raw.json', import.meta.url), 'utf8')) as Raw).data.user.contributionsCollection
const commits = cc.totalCommitContributions
const issues = cc.totalIssueContributions
const prs = cc.totalPullRequestContributions
const reviews = cc.totalPullRequestReviewContributions
const total = commits + issues + prs + reviews || 1
const pct = (n: number): number => Math.round((100 * n) / total)
const totalContrib = cc.contributionCalendar.totalContributions
const nf = (n: number): string => n.toLocaleString('en')

const W = 860
const H = 220
const cx = 600
const cy = 118
const arm = 118 // longueur d'un bras à 100%

function svg(t: Theme): string {
  const id = `act-${t.key}`
  // longueurs proportionnelles (min 0 → point au centre)
  const lCommit = (arm * pct(commits)) / 100
  const lIssue = (arm * pct(issues)) / 100
  const lReview = (arm * pct(reviews)) / 100
  const lPr = (arm * pct(prs)) / 100
  const branch = (x2: number, y2: number, len: number, color: string): string =>
    len > 2
      ? `<line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="3" stroke-linecap="round"/><circle cx="${x2}" cy="${y2}" r="4" fill="${color}"/>`
      : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
  <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${t.card0}"/><stop offset="1" stop-color="${t.card1}"/></linearGradient></defs>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12" fill="url(#${id})" stroke="${t.border}"/>
  <rect x="0.5" y="0.5" width="${W - 1}" height="2.5" rx="1" fill="${t.accent}"/>

  <text x="30" y="42" font-family="${MONO}" font-size="12" letter-spacing="1.5" fill="${t.muted}">ACTIVITY OVERVIEW · LAST 12 MONTHS</text>
  <text x="30" y="104" font-family="${SERIF}" font-size="52" font-weight="600" fill="${t.text}">${nf(totalContrib)}</text>
  <text x="32" y="132" font-family="${MONO}" font-size="13" fill="${t.muted}">contributions</text>
  <text x="30" y="176" font-family="${MONO}" font-size="13.5" fill="${t.commit}">${pct(commits)}% commits</text>
  <text x="30" y="196" font-family="${MONO}" font-size="12" fill="${t.dim}">a pure builder — code, not tickets</text>

  <!-- axes -->
  <line x1="${cx - arm - 24}" y1="${cy}" x2="${cx + arm + 24}" y2="${cy}" stroke="${t.axis}" stroke-width="1"/>
  <line x1="${cx}" y1="${cy - arm + 8}" x2="${cx}" y2="${cy + arm - 8}" stroke="${t.axis}" stroke-width="1"/>
  <!-- branches -->
  ${branch(cx - lCommit, cy, lCommit, t.commit)}
  ${branch(cx + lIssue, cy, lIssue, t.accent)}
  ${branch(cx, cy - lReview, lReview, t.accent)}
  ${branch(cx, cy + lPr, lPr, t.accent)}
  <!-- labels -->
  <text x="${cx - arm - 30}" y="${cy - 8}" text-anchor="end" font-family="${MONO}" font-size="12" fill="${t.commit}">${pct(commits)}%</text>
  <text x="${cx - arm - 30}" y="${cy + 10}" text-anchor="end" font-family="${MONO}" font-size="11" fill="${t.dim}">Commits</text>
  <text x="${cx + arm + 32}" y="${cy + 4}" font-family="${MONO}" font-size="11" fill="${t.dim}">Issues</text>
  <text x="${cx}" y="${cy - arm - 2}" text-anchor="middle" font-family="${MONO}" font-size="11" fill="${t.dim}">Code review</text>
  <text x="${cx}" y="${cy + arm + 12}" text-anchor="middle" font-family="${MONO}" font-size="11" fill="${t.dim}">Pull requests</text>
</svg>`
}

for (const t of THEMES) writeFileSync(new URL(`./out/activity-${t.key}.svg`, import.meta.url), svg(t))
console.log(`OK — activity dark+light. commits=${pct(commits)}% issues=${pct(issues)}% pr=${pct(prs)}% review=${pct(reviews)}%`)
