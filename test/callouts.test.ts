import { beforeAll, describe, expect, it } from 'vitest'
import { buildScenario } from './scenario.ts'

let outcome: Awaited<ReturnType<typeof buildScenario>>
let html = ''

beforeAll(async () => {
  outcome = await buildScenario('callouts')
  html =
    outcome.results?.find((result) => result.url === '/writing/notes/')
      ?.content ?? ''
}, 60_000)

function failureText(error: Error | undefined) {
  const parts: string[] = []
  let current: unknown = error
  while (current instanceof Error) {
    parts.push(current.message)
    current =
      (current as Error & { originalError?: unknown }).originalError ??
      current.cause
  }
  return parts.join('\n')
}

function callout(type: string) {
  const match = html.match(
    new RegExp(`<aside class="callout callout-${type}">[\\s\\S]*?</aside>`)
  )
  return match?.[0] ?? ''
}

describe('callouts', () => {
  it('builds without error', () => {
    expect(outcome.error).toBeUndefined()
    expect(html).not.toBe('')
  })

  it.each([
    ['note', 'Note'],
    ['tip', 'Tip'],
    ['warning', 'Warning'],
    ['tradeoff', 'Trade-off']
  ])('renders a %s callout with a %s label first', (type, label) => {
    expect(callout(type)).toMatch(
      new RegExp(
        `^<aside class="callout callout-${type}">\\s*<p class="callout-label">${label}</p>`
      )
    )
  })

  it('renders the markdown inside a callout', () => {
    expect(callout('note')).toContain('<strong>bold</strong>')
    expect(callout('tip')).toMatch(/<ul>[\s\S]*<li>first item<\/li>/)
  })
})

describe('callout failures', () => {
  it('fails the build naming the post and the type when a callout type is unknown', async () => {
    const outcome = await buildScenario('callout-unknown')

    expect(outcome.error).toBeDefined()
    const text = failureText(outcome.error)
    expect(text).toContain('danger-post/index.md')
    expect(text).toContain('unknown callout type "danger"')
  }, 60_000)

  it('fails the build naming the post when a callout has no type', async () => {
    const outcome = await buildScenario('callout-bare')

    expect(outcome.error).toBeDefined()
    const text = failureText(outcome.error)
    expect(text).toContain('bare-post/index.md')
    expect(text).toContain('unknown callout type ""')
  }, 60_000)
})
