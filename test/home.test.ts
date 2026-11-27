import { join } from 'node:path'
import { register } from 'tsx/esm/api'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildScenario } from './scenario'

interface BuildResult {
  url: string
  content: string
}

let results: BuildResult[]

beforeAll(async () => {
  register({
    tsconfig: join(import.meta.dirname, 'scenarios.tsconfig.json')
  })
  const { default: Eleventy } = await import('@11ty/eleventy')
  results = await new Eleventy('src', '_site', {
    configPath: 'eleventy.config.ts'
  }).toJSON()
}, 60_000)

function homeMain() {
  const page = results.find((result) => result.url === '/')
  return page?.content.match(/<main[\s>]([\s\S]*)<\/main>/)?.[1] ?? ''
}

describe('home page with no posts', () => {
  it('shows the intro and the links row with no featured section', () => {
    const main = homeMain()

    expect(main).not.toBe('')

    const paragraphs = [...main.matchAll(/<p[\s>][\s\S]*?<\/p>/g)].map(
      (match) => match[0].replace(/<[^>]*>/g, '').trim()
    )
    expect(paragraphs.some((text) => text.length > 0)).toBe(true)

    const hrefs = [...main.matchAll(/<a\s[^>]*>/g)].map(
      (match) => match[0].match(/href="([^"]*)"/)?.[1]
    )
    expect(hrefs).toContain('https://www.linkedin.com/in/michaeldmoser/')
    expect(hrefs).toContain('https://github.com/michaeldmoser')

    expect(main).not.toMatch(/\sdata-contact\b/)

    expect(main).not.toMatch(/<section\b[^>]*\bid="featured"/)
  })
})

async function featuredLinks(scenario: string) {
  const outcome = await buildScenario(scenario)
  expect(outcome.error).toBeUndefined()
  const page = outcome.results?.find((result) => result.url === '/')
  expect(page).toBeDefined()
  const featured =
    page?.content.match(
      /<section\b[^>]*\bid="featured"[^>]*>[\s\S]*?<\/section>/
    )?.[0] ?? ''

  expect(featured).not.toBe('')

  return [...featured.matchAll(/<a\s[^>]*>[\s\S]*?<\/a>/g)].map((match) => ({
    href: match[0].match(/href="([^"]*)"/)?.[1] ?? '',
    text: match[0].replace(/<[^>]*>/g, '').trim()
  }))
}

describe('home page featured fill', () => {
  it('lists the marked post first then the newest unmarked posts up to three each linked by title', async () => {
    const links = await featuredLinks('featured-fill')

    expect(links.map((link) => link.text)).toEqual([
      'Marked Older Post',
      'Newest Unmarked Post',
      'Second Unmarked Post'
    ])
    expect(links.map((link) => link.href)).toEqual([
      expect.stringContaining('marked-older'),
      expect.stringContaining('newest-unmarked'),
      expect.stringContaining('second-unmarked')
    ])
  }, 60_000)

  it('shows only the three marked posts newest first when newer unmarked posts exist', async () => {
    const links = await featuredLinks('featured-three')

    expect(links.map((link) => link.text)).toEqual([
      'Bravo Marked Post',
      'Charlie Marked Post',
      'Alpha Marked Post'
    ])
  }, 60_000)
})

function failureText(error: Error | undefined) {
  const parts: string[] = []
  let current: unknown = error
  while (current instanceof Error) {
    parts.push(current.message)
    current = current.cause
  }
  return parts.join('\n')
}

describe('more than three featured posts', () => {
  const marked = [
    'first-marked',
    'second-marked',
    'third-marked',
    'fourth-marked'
  ]

  it.each(['build', 'serve'] as const)(
    'fails the %s run naming every marked post',
    async (runMode) => {
      const outcome = await buildScenario('featured-too-many', { runMode })

      expect(outcome.error).toBeDefined()
      const text = failureText(outcome.error)
      for (const slug of marked) {
        expect(text).toContain(`${slug}/index.md`)
      }
    },
    60_000
  )
})

describe('featured posts with a marked draft', () => {
  it('builds and features only the three published marked posts', async () => {
    const links = await featuredLinks('featured-draft')

    expect(links.map((link) => link.text)).toEqual([
      'Three Marked Post',
      'Two Marked Post',
      'One Marked Post'
    ])
  }, 60_000)
})
