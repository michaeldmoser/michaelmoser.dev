import { beforeAll, describe, expect, it } from 'vitest'
import { buildScenario } from './scenario.ts'

interface BuildResult {
  url: string
  content: string
}

let valid: { results?: BuildResult[]; error?: Error }

beforeAll(async () => {
  valid = await buildScenario('valid')
}, 60_000)

function anchors(fragment: string) {
  return [...fragment.matchAll(/<a\s[^>]*>[\s\S]*?<\/a>/g)].map((match) => ({
    href: match[0].match(/href="([^"]*)"/)?.[1],
    text: match[0].replace(/<[^>]*>/g, '').trim()
  }))
}

function mainOf(html: string) {
  return html.match(/<main[\s>]([\s\S]*)<\/main>/)?.[1] ?? ''
}

describe('post page', () => {
  it('shows the post title, UTC date, tag labels linking to tag pages and the rendered body', () => {
    expect(valid.error).toBeUndefined()
    const page = valid.results?.find(
      (result) => result.url === '/writing/shipping-small-batches/'
    )

    expect(page).toBeDefined()
    const main = mainOf(page?.content ?? '')
    const heading = main.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)
    expect(heading?.[1].replace(/<[^>]*>/g, '').trim()).toBe(
      'Shipping Small Batches'
    )
    const timeTag = main.match(/<time\b[^>]*>[\s\S]*?<\/time>/)?.[0] ?? ''
    expect(timeTag).toMatch(/\sdatetime="2026-05-15"/)
    expect(timeTag.replace(/<[^>]*>/g, '').trim()).toBe('May 15, 2026')
    expect(anchors(main)).toEqual(
      expect.arrayContaining([
        {
          href: '/writing/tags/engineering-leadership/',
          text: 'Engineering Leadership'
        },
        { href: '/writing/tags/testing/', text: 'Testing Practices' }
      ])
    )
    expect(main).toContain('<strong>reduce risk</strong>')
    expect(main).toMatch(/<h2[^>]*>Why small batches<\/h2>/)
    expect(main).toContain('<li>Ship daily</li>')
  })
})
