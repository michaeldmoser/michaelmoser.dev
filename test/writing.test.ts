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

describe('writing index with several posts', () => {
  it('lists every post newest-first with a linked title, date and description', () => {
    expect(valid.error).toBeUndefined()
    const page = valid.results?.find((result) => result.url === '/writing/')

    expect(page).toBeDefined()
    const main = mainOf(page?.content ?? '')
    const text = main.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
    expect(text).not.toContain('First posts coming soon')

    const postLinks = anchors(main).filter((link) =>
      /^\/writing\/[a-z0-9-]+\/$/.test(link.href ?? '')
    )
    expect(postLinks).toEqual([
      {
        href: '/writing/reading-the-incident-log/',
        text: 'Reading the Incident Log'
      },
      {
        href: '/writing/shipping-small-batches/',
        text: 'Shipping Small Batches'
      },
      {
        href: '/writing/measuring-what-matters/',
        text: 'Measuring What Matters'
      }
    ])

    const times = [...main.matchAll(/<time\b([^>]*)>([\s\S]*?)<\/time>/g)].map(
      (match) => ({
        datetime: match[1].match(/datetime="([^"]*)"/)?.[1],
        text: match[2].replace(/<[^>]*>/g, '').trim()
      })
    )
    expect(times).toEqual([
      { datetime: '2026-09-30', text: 'September 30, 2026' },
      { datetime: '2026-05-15', text: 'May 15, 2026' },
      { datetime: '2026-03-02', text: 'March 2, 2026' }
    ])

    const descriptions = [
      'What an incident log tells you after the fact.',
      'Why small batches shorten feedback loops.',
      'Picking metrics that change decisions.'
    ]
    const positions = descriptions.map((description) =>
      text.indexOf(description)
    )
    expect(positions.every((position) => position >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })
})

function tagPage(tag: string) {
  const page = valid.results?.find(
    (result) => result.url === `/writing/tags/${tag}/`
  )
  const main = mainOf(page?.content ?? '')
  const heading = main.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? ''
  const postLinks = anchors(main).filter((link) =>
    /^\/writing\/[a-z0-9-]+\/$/.test(link.href ?? '')
  )
  const times = [...main.matchAll(/<time\b([^>]*)>([\s\S]*?)<\/time>/g)].map(
    (match) => ({
      datetime: match[1].match(/datetime="([^"]*)"/)?.[1],
      text: match[2].replace(/<[^>]*>/g, '').trim()
    })
  )
  const text = main.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
  return {
    page,
    heading: heading.replace(/<[^>]*>/g, '').trim(),
    postLinks,
    times,
    text
  }
}

describe('tag pages', () => {
  it('lists exactly the engineering-leadership posts newest-first under its label heading', () => {
    expect(valid.error).toBeUndefined()
    const { page, heading, postLinks, times, text } = tagPage(
      'engineering-leadership'
    )

    expect(page).toBeDefined()
    expect(heading).toBe('Posts tagged Engineering Leadership')
    expect(postLinks).toEqual([
      {
        href: '/writing/reading-the-incident-log/',
        text: 'Reading the Incident Log'
      },
      {
        href: '/writing/shipping-small-batches/',
        text: 'Shipping Small Batches'
      }
    ])
    expect(times).toEqual([
      { datetime: '2026-09-30', text: 'September 30, 2026' },
      { datetime: '2026-05-15', text: 'May 15, 2026' }
    ])
    expect(text).toContain('What an incident log tells you after the fact.')
    expect(text).toContain('Why small batches shorten feedback loops.')
  })

  it('lists exactly the testing posts newest-first under its label heading', () => {
    expect(valid.error).toBeUndefined()
    const { page, heading, postLinks, times, text } = tagPage('testing')

    expect(page).toBeDefined()
    expect(heading).toBe('Posts tagged Testing Practices')
    expect(postLinks).toEqual([
      {
        href: '/writing/shipping-small-batches/',
        text: 'Shipping Small Batches'
      },
      {
        href: '/writing/measuring-what-matters/',
        text: 'Measuring What Matters'
      }
    ])
    expect(times).toEqual([
      { datetime: '2026-05-15', text: 'May 15, 2026' },
      { datetime: '2026-03-02', text: 'March 2, 2026' }
    ])
    expect(text).toContain('Why small batches shorten feedback loops.')
    expect(text).toContain('Picking metrics that change decisions.')
  })

  it('generates no page for a vocabulary tag that no post uses', () => {
    expect(valid.error).toBeUndefined()

    const urls = (valid.results ?? []).map((result) => result.url)
    expect(urls).toContain('/writing/')
    expect(urls).not.toContain('/writing/tags/unused-topic/')
  })
})
