/**
 * fetch.ts — récupère les vraies données GitHub via GraphQL et écrit out/raw.json.
 * Token : GH_TOKEN (le GITHUB_TOKEN natif de l'Action suffit — données publiques).
 */
import { writeFileSync, mkdirSync } from 'node:fs'

const token = process.env.GH_TOKEN
const user = process.env.GH_USER ?? 'Chrlstopher-c'
if (!token) throw new Error('GH_TOKEN manquant')

// Premier jour du mois courant (UTC) — pour les commits "ce mois".
const now = new Date()
const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()

const query = `
{
  user(login: "${user}") {
    login
    followers { totalCount }
    following { totalCount }
    contributionsCollection {
      totalCommitContributions
      totalIssueContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false, orderBy: {field: STARGAZERS, direction: DESC}) {
      totalCount
      nodes {
        name stargazerCount forkCount isPrivate
        primaryLanguage { name color }
        defaultBranchRef { target { ... on Commit { history(since: "${since}") { totalCount } } } }
      }
    }
  }
}`

const res = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: { authorization: `bearer ${token}`, 'content-type': 'application/json', 'user-agent': 'github-cards' },
  body: JSON.stringify({ query }),
})
if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`)
const json = await res.json()
if (json.errors) throw new Error(`GraphQL: ${JSON.stringify(json.errors)}`)

mkdirSync(new URL('./out/', import.meta.url), { recursive: true })
writeFileSync(new URL('./out/raw.json', import.meta.url), JSON.stringify(json))
console.log('OK — out/raw.json écrit pour', user)
