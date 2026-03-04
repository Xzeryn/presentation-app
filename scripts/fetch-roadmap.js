#!/usr/bin/env node
/**
 * Fetches Elastic product roadmap from GitHub Projects and writes to public/config/roadmap.json.
 * Requires GITHUB_TOKEN with read:org and read:project scopes.
 *
 * Usage: npm run fetch:roadmap
 * Or:    GITHUB_TOKEN=xxx node scripts/fetch-roadmap.js
 */

import 'dotenv/config'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = join(__dirname, '..', 'public', 'config', 'roadmap.json')

const GITHUB_GRAPHQL = 'https://api.github.com/graphql'
const ORG = 'elastic'
const PROJECT_NUMBER = 2066

async function graphql(query, variables = {}) {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    console.error('Error: GITHUB_TOKEN is required. Set it in .env or pass as env var.')
    process.exit(1)
  }

  const res = await fetch(GITHUB_GRAPHQL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub API error ${res.status}: ${text}`)
  }

  const json = await res.json()
  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`)
  }
  return json.data
}

async function fetchProjectItems(cursor = null) {
  const query = `
    query($org: String!, $projectNum: Int!, $cursor: String) {
      organization(login: $org) {
        projectV2(number: $projectNum) {
          id
          title
          fields(first: 20) {
            nodes {
              ... on ProjectV2Field {
                id
                name
              }
              ... on ProjectV2SingleSelectField {
                id
                name
                options {
                  id
                  name
                }
              }
            }
          }
          items(first: 100, after: $cursor) {
            pageInfo {
              endCursor
              hasNextPage
            }
            nodes {
              id
              content {
                ... on Issue {
                  id
                  number
                  title
                  body
                  url
                  state
                  labels(first: 20) {
                    nodes {
                      name
                    }
                  }
                }
                ... on PullRequest {
                  id
                  number
                  title
                  body
                  url
                  state
                  labels(first: 20) {
                    nodes {
                      name
                    }
                  }
                }
                ... on DraftIssue {
                  id
                  title
                  body
                }
              }
              fieldValues(first: 20) {
                nodes {
                  __typename
                  ... on ProjectV2ItemFieldTextValue {
                    text
                    field {
                      ... on ProjectV2Field {
                        name
                      }
                    }
                  }
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                    optionId
                    field {
                      ... on ProjectV2Field {
                        name
                      }
                    }
                  }
                  ... on ProjectV2ItemFieldDateValue {
                    date
                    field {
                      ... on ProjectV2Field {
                        name
                      }
                    }
                  }
                  ... on ProjectV2ItemFieldNumberValue {
                    number
                    field {
                      ... on ProjectV2Field {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `

  const data = await graphql(query, {
    org: ORG,
    projectNum: PROJECT_NUMBER,
    cursor,
  })

  return data.organization?.projectV2
}

async function fetchIssueComments(owner, repo, issueNumber) {
  const token = process.env.GITHUB_TOKEN
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=100`
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!res.ok) return []
  const comments = await res.json()
  return comments.map((c) => ({
    body: c.body,
    user: c.user?.login,
    createdAt: c.created_at,
  }))
}

function extractRepoFromUrl(url) {
  const match = url?.match(/github\.com\/([^/]+)\/([^/]+)/)
  return match ? { owner: match[1], repo: match[2] } : null
}

function parseFieldValues(nodes) {
  const result = {}
  for (const node of nodes || []) {
    if (!node?.field?.name) continue
    const fieldName = node.field.name
    if (node.__typename === 'ProjectV2ItemFieldTextValue') {
      result[fieldName] = node.text
    } else if (node.__typename === 'ProjectV2ItemFieldSingleSelectValue') {
      result[fieldName] = node.name
    } else if (node.__typename === 'ProjectV2ItemFieldDateValue') {
      result[fieldName] = node.date
    } else if (node.__typename === 'ProjectV2ItemFieldNumberValue') {
      result[fieldName] = node.number
    }
  }
  return result
}

function quarterFromDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const q = Math.ceil((d.getMonth() + 1) / 3)
  return `Q${q} ${d.getFullYear()}`
}

async function main() {
  console.log('Fetching Elastic roadmap from GitHub...')

  const allItems = []
  let cursor = null

  do {
    const project = await fetchProjectItems(cursor)
    if (!project) {
      console.error('Project not found. Check org, project number, and token permissions.')
      process.exit(1)
    }

    const items = project.items
    for (const node of items.nodes) {
      const content = node.content
      if (!content) continue

      const fieldValues = parseFieldValues(node.fieldValues?.nodes)
      const labels = content.labels?.nodes?.map((l) => l.name) || []
      const kiRaw = fieldValues['Key initiatives'] || fieldValues['Key Initiatives'] || fieldValues['Key Initiative']
      const keyInitiatives = Array.isArray(kiRaw) ? kiRaw : kiRaw ? [kiRaw] : []
      const releaseType = fieldValues['Release type'] || fieldValues['Release Type'] || null
      const targetDate = fieldValues['Target date'] || fieldValues['Target Date'] || null
      const quarter = quarterFromDate(targetDate) || fieldValues['Quarter'] || null

      // Infer product area from labels or a custom field
      const productArea = fieldValues['Product area'] || fieldValues['Product Area'] || labels.find((l) =>
        ['Search', 'Observability', 'Security', 'Elasticsearch', 'Kibana', 'Fleet'].some((pa) =>
          l.toLowerCase().includes(pa.toLowerCase())
        )
      ) || 'Other'

      const item = {
        id: node.id,
        contentId: content.id,
        title: content.title,
        body: content.body || '',
        url: content.url || null,
        state: content.state || null,
        labels,
        keyInitiatives: Array.isArray(keyInitiatives) ? keyInitiatives : [keyInitiatives],
        releaseType,
        targetDate,
        quarter,
        productArea: String(productArea),
        fieldValues,
      }

      allItems.push(item)
    }

    cursor = items.pageInfo.hasNextPage ? items.pageInfo.endCursor : null
    if (cursor) {
      console.log(`  Fetched ${allItems.length} items, fetching more...`)
      await new Promise((r) => setTimeout(r, 500))
    }
  } while (cursor)

  // Optionally fetch comments for each issue (adds many API calls)
  const FETCH_COMMENTS = process.env.FETCH_ROADMAP_COMMENTS === 'true'
  if (FETCH_COMMENTS) {
    console.log('Fetching comments (this may take a while)...')
    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i]
      if (item.url && item.url.includes('/issues/')) {
        const repo = extractRepoFromUrl(item.url)
        const issueNum = item.url.match(/\/issues\/(\d+)/)?.[1]
        if (repo && issueNum) {
          item.comments = await fetchIssueComments(repo.owner, repo.repo, issueNum)
          await new Promise((r) => setTimeout(r, 200))
        }
      }
    }
  } else {
    console.log('Skipping comments (set FETCH_ROADMAP_COMMENTS=true to include)')
  }

  const output = {
    fetchedAt: new Date().toISOString(),
    source: `https://github.com/orgs/${ORG}/projects/${PROJECT_NUMBER}`,
    items: allItems,
  }

  const outDir = dirname(OUTPUT_PATH)
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true })
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8')
  console.log(`Wrote ${allItems.length} items to ${OUTPUT_PATH}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
