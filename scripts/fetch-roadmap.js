#!/usr/bin/env node
/**
 * Fetches Elastic product roadmap from GitHub Projects and writes to public/config/roadmap.json.
 * Requires GITHUB_TOKEN with read:org and read:project scopes.
 *
 * Optional: Set FETCH_ROADMAP_SUMMARIZE=true to add AI summaries via AWS Bedrock.
 * Requires BEDROCK_MODEL_ID, AWS_REGION, and AWS credentials.
 * Optional: Set SUMMARIZE_PROMPT_FILE=public/config/summarize-prompt.txt to use a custom prompt (e.g. for PUBSEC/DOD).
 *
 * Discovery: Set FETCH_ROADMAP_DISCOVER=true to dump project schema and sample field values
 * to public/config/roadmap-schema.json. Use this to find actual field names, then update
 * scripts/roadmap-field-mapping.json accordingly.
 *
 * Usage: npm run fetch:roadmap
 * Or:    GITHUB_TOKEN=xxx node scripts/fetch-roadmap.js
 * Or:    FETCH_ROADMAP_DISCOVER=true npm run fetch:roadmap
 */

import 'dotenv/config'
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = join(__dirname, '..', 'public', 'config', 'roadmap.json')
const SCHEMA_PATH = join(__dirname, '..', 'public', 'config', 'roadmap-schema.json')
const MAPPING_PATH = join(__dirname, 'roadmap-field-mapping.json')

const DEFAULT_SUMMARIZE_PROMPT = `Summarize this product roadmap item for a sales presenter. Output exactly three lines in this format:
For: [1-line audience - who is this for]
Value: [1-line customer benefit - why it matters]
Scope: [1-line what's included - key capabilities]

Be concise. No other text.`

let _cachedPrompt = null
function getSummarizePrompt() {
  if (_cachedPrompt !== null) return _cachedPrompt
  const promptPath = process.env.SUMMARIZE_PROMPT_FILE
  if (promptPath) {
    const resolved = join(__dirname, '..', promptPath)
    if (existsSync(resolved)) {
      _cachedPrompt = readFileSync(resolved, 'utf8').trim()
      return _cachedPrompt
    }
  }
  _cachedPrompt = DEFAULT_SUMMARIZE_PROMPT
  return _cachedPrompt
}

const GITHUB_GRAPHQL = 'https://api.github.com/graphql'
const ORG = 'elastic'
const PROJECT_NUMBER = 2066

function loadFieldMapping() {
  try {
    const raw = readFileSync(MAPPING_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    return {
      keyInitiatives: [].concat(parsed.keyInitiatives || []),
      releaseType: [].concat(parsed.releaseType || []),
      status: [].concat(parsed.status || []),
      productArea: [].concat(parsed.productArea || []),
    }
  } catch {
    return {
      keyInitiatives: ['Key Initiative', 'Key initiatives', 'Key Initiatives'],
      releaseType: ['Release type', 'Release Type'],
      status: ['Status'],
      productArea: ['Product area', 'Product Area'],
    }
  }
}

function getMappedValue(fieldValues, mappingKeys) {
  for (const key of mappingKeys) {
    if (fieldValues[key] !== undefined && fieldValues[key] !== null && fieldValues[key] !== '') {
      return fieldValues[key]
    }
  }
  return null
}

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
          fields(first: 50) {
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
              ... on ProjectV2IterationField {
                id
                name
                configuration {
                  iterations {
                    id
                    startDate
                    title
                  }
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
              fieldValues(first: 30) {
                nodes {
                  __typename
                  ... on ProjectV2ItemFieldTextValue {
                    text
                    field {
                      ... on ProjectV2FieldCommon {
                        name
                      }
                    }
                  }
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                    optionId
                    field {
                      ... on ProjectV2FieldCommon {
                        name
                      }
                    }
                  }
                  ... on ProjectV2ItemFieldDateValue {
                    date
                    field {
                      ... on ProjectV2FieldCommon {
                        name
                      }
                    }
                  }
                  ... on ProjectV2ItemFieldNumberValue {
                    number
                    field {
                      ... on ProjectV2FieldCommon {
                        name
                      }
                    }
                  }
                  ... on ProjectV2ItemFieldIterationValue {
                    title
                    startDate
                    duration
                    field {
                      ... on ProjectV2FieldCommon {
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

async function runDiscovery() {
  console.log('Discovery mode: fetching project schema and sample field values...')

  const project = await fetchProjectItems(null)
  if (!project) {
    console.error('Project not found. Check org, project number, and token permissions.')
    process.exit(1)
  }

  const fields = project.fields?.nodes || []
  const sampleItem = project.items?.nodes?.[0]
  const sampleFieldValues = sampleItem?.fieldValues?.nodes || []

  const schema = {
    discoveredAt: new Date().toISOString(),
    source: `https://github.com/orgs/${ORG}/projects/${PROJECT_NUMBER}`,
    projectTitle: project.title,
    fields: fields.map((f) => ({
      id: f.id,
      name: f.name,
      __typename: f.__typename,
      options: f.options,
      configuration: f.configuration,
    })),
    sampleItem: sampleItem
      ? {
          id: sampleItem.id,
          title: sampleItem.content?.title,
          fieldValues: sampleFieldValues
            .filter((fv) => fv.field?.name)
            .map((fv) => ({
              __typename: fv.__typename,
              fieldName: fv.field?.name,
              value:
                fv.__typename === 'ProjectV2ItemFieldIterationValue'
                  ? { title: fv.title, startDate: fv.startDate, duration: fv.duration }
                  : fv.text ?? fv.name ?? fv.date ?? fv.number,
            })),
        }
      : null,
    suggestedMapping: {
      keyInitiatives: 'Edit roadmap-field-mapping.json: add the exact field name for Key initiatives',
      releaseType: 'Edit roadmap-field-mapping.json: add the exact field name for Release type',
      status: 'Edit roadmap-field-mapping.json: add the exact field name for Status',
    },
  }

  const outDir = dirname(SCHEMA_PATH)
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true })
  }
  writeFileSync(SCHEMA_PATH, JSON.stringify(schema, null, 2), 'utf8')
  console.log(`Wrote schema to ${SCHEMA_PATH}`)
  console.log('Review the field names in "fields" and "sampleItem.fieldValues", then update scripts/roadmap-field-mapping.json')
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
    } else if (node.__typename === 'ProjectV2ItemFieldIterationValue') {
      result[fieldName] = node.title || (node.startDate ? quarterFromDate(node.startDate) : null)
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

function truncateBody(body, maxLen = 200) {
  if (!body || typeof body !== 'string') return ''
  const stripped = body
    .replace(/\*\*[^*]+\*\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*_`]/g, '')
    .replace(/\n+/g, ' ')
    .trim()
  return stripped.length <= maxLen ? stripped : stripped.slice(0, maxLen).trim() + '…'
}

async function summarizeWithBedrock(item) {
  const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0'
  const region = process.env.AWS_REGION || 'us-east-1'

  const client = new BedrockRuntimeClient({ region })
  const input = `${item.title}\n\n${item.body || ''}`.slice(0, 8000)

  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: `${getSummarizePrompt()}\n\n---\n\n${input}` }],
      },
    ],
  }

  const response = await client.send(
    new InvokeModelCommand({
      contentType: 'application/json',
      body: JSON.stringify(payload),
      modelId,
    })
  )

  const responseBody = JSON.parse(new TextDecoder().decode(response.body))
  const text = responseBody.content?.[0]?.text?.trim() || ''

  const summary = { for: null, value: null, scope: null }
  for (const line of text.split('\n')) {
    const m = line.match(/^(For|Value|Scope):\s*(.+)$/i)
    if (m) summary[m[1].toLowerCase()] = m[2].trim()
  }
  return summary
}

async function main() {
  const discoverMode = process.env.FETCH_ROADMAP_DISCOVER === 'true' || process.argv.includes('--discover')
  if (discoverMode) {
    await runDiscovery()
    return
  }

  console.log('Fetching Elastic roadmap from GitHub...')
  const mapping = loadFieldMapping()

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

      const kiRaw = getMappedValue(fieldValues, mapping.keyInitiatives)
      const keyInitiatives = Array.isArray(kiRaw) ? kiRaw : kiRaw ? [kiRaw] : []
      const releaseType = getMappedValue(fieldValues, mapping.releaseType)
      const status = getMappedValue(fieldValues, mapping.status)

      // Infer product area from mapping, then labels
      const productArea =
        getMappedValue(fieldValues, mapping.productArea) ||
        labels.find((l) =>
          ['Search', 'Observability', 'Security', 'Elasticsearch', 'Kibana', 'Fleet'].some((pa) =>
            l.toLowerCase().includes(pa.toLowerCase())
          )
        ) ||
        'Other'

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
        status,
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

  // Optional: AI summarization via Bedrock
  const shouldSummarize = process.env.FETCH_ROADMAP_SUMMARIZE === 'true'
  if (shouldSummarize) {
    console.log('Summarizing items with Bedrock...')
    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i]
      try {
        item.summary = await summarizeWithBedrock(item)
        if ((i + 1) % 10 === 0) console.log(`  Summarized ${i + 1}/${allItems.length}...`)
        await new Promise((r) => setTimeout(r, 300))
      } catch (err) {
        console.warn(`  Summary failed for "${item.title}": ${err.message}`)
        item.summary = null
      }
    }
  } else {
    console.log('Skipping summarization (set FETCH_ROADMAP_SUMMARIZE=true to enable)')
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
