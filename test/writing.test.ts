import { XMLParser, XMLValidator } from 'fast-xml-parser'
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

function parsedFeed() {
  const xml =
    valid.results?.find((result) => result.url === '/feed.xml')?.content ?? ''
  const { feed } = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false
  }).parse(xml)
  const entries: Record<string, unknown>[] = [feed?.entry ?? []].flat()
  return { xml, feed, entries }
}

describe('atom feed with posts', () => {
  it('is a valid feed with one absolute-url entry per post, newest-first, updated at the newest post and no email', () => {
    expect(valid.error).toBeUndefined()
    const { xml, feed, entries } = parsedFeed()

    expect(xml).not.toBe('')
    expect(XMLValidator.validate(xml)).toBe(true)
    expect(feed['@_xmlns']).toBe('http://www.w3.org/2005/Atom')
    expect(feed.id).toBe('https://michaelmoser.dev/feed.xml')
    expect(feed.title).toBe('Michael Moser — Writing')
    expect(feed.author.name).toBe('Michael Moser')
    expect(xml).not.toContain('<email')
    expect(new Date(feed.updated).getTime()).toBe(
      Date.parse('2026-09-30T00:00:00Z')
    )

    const urls = [
      'https://michaelmoser.dev/writing/reading-the-incident-log/',
      'https://michaelmoser.dev/writing/shipping-small-batches/',
      'https://michaelmoser.dev/writing/measuring-what-matters/'
    ]
    expect(entries.map((entry) => entry.id)).toEqual(urls)
    expect(entries.map((entry) => entry.title)).toEqual([
      'Reading the Incident Log',
      'Shipping Small Batches',
      'Measuring What Matters'
    ])
    for (const [index, entry] of entries.entries()) {
      const links = [entry.link ?? []].flat() as Record<string, string>[]
      const alternate = links.find(
        (link) => (link['@_rel'] ?? 'alternate') === 'alternate'
      )
      expect(alternate?.['@_href']).toBe(urls[index])
      expect(String(entry.updated)).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    }
  })

  it('carries each post as full html content with relative links made absolute', () => {
    expect(valid.error).toBeUndefined()
    const { entries } = parsedFeed()

    const contentOf = (id: string) => {
      const content = entries.find((entry) => entry.id === id)?.content as
        | Record<string, string>
        | undefined
      return { type: content?.['@_type'], html: content?.['#text'] ?? '' }
    }
    const incident = contentOf(
      'https://michaelmoser.dev/writing/reading-the-incident-log/'
    )
    expect(incident.type).toBe('html')
    expect(incident.html).toMatch(
      /<a href="https:\/\/michaelmoser\.dev\/writing\/shipping-small-batches\/">the earlier post<\/a>/
    )
    expect(incident.html).not.toMatch(/href="\/writing\//)

    const shipping = contentOf(
      'https://michaelmoser.dev/writing/shipping-small-batches/'
    )
    expect(shipping.html).toContain('<strong>reduce risk</strong>')
    expect(shipping.html).toMatch(/<h2[^>]*>Why small batches<\/h2>/)
    expect(shipping.html).toContain('<li>Ship daily</li>')
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

function failureText(error: Error | undefined) {
  const parts: string[] = []
  let current: unknown = error
  while (current instanceof Error) {
    parts.push(current.message)
    current = current.cause
  }
  return parts.join('\n')
}

describe('build validation failures', () => {
  it('fails the build naming the post and the field when a post has no date', async () => {
    const outcome = await buildScenario('missing-field')

    expect(outcome.error).toBeDefined()
    const text = failureText(outcome.error)
    expect(text).toContain('lacking-post')
    expect(text).toMatch(/\bdate\b/)
    expect(text).not.toContain('complete-post')
  }, 60_000)

  it('fails the build naming both posts when two folders share a slug', async () => {
    const outcome = await buildScenario('duplicate-slug')

    expect(outcome.error).toBeDefined()
    const text = failureText(outcome.error)
    expect(text).toContain('Foo/index.md')
    expect(text).toContain('foo/index.md')
  }, 60_000)

  it('fails the build naming a markdown file that is not a post folder index', async () => {
    const outcome = await buildScenario('stray-file')

    expect(outcome.error).toBeDefined()
    const text = failureText(outcome.error)
    expect(text).toContain('stray-note.md')
    expect(text).not.toContain('real-post')
  }, 60_000)

  it('fails the build naming the post and the tag when a tag is not in the vocabulary', async () => {
    const outcome = await buildScenario('unknown-tag')

    expect(outcome.error).toBeDefined()
    const text = failureText(outcome.error)
    expect(text).toContain('mystery-post')
    expect(text).toContain('not-in-vocabulary')
  }, 60_000)

  it('fails the build naming the post and ogImage when the image file is missing', async () => {
    const outcome = await buildScenario('og-image-missing')

    expect(outcome.error).toBeDefined()
    const text = failureText(outcome.error)
    expect(text).toContain('Invalid posts')
    expect(text).toContain('ghost-image-post')
    expect(text).toMatch(/ogImage/)
  }, 60_000)

  it('fails the build naming the post and ogImage when the image is not a png or jpg', async () => {
    const outcome = await buildScenario('og-image-gif')

    expect(outcome.error).toBeDefined()
    const text = failureText(outcome.error)
    expect(text).toContain('Invalid posts')
    expect(text).toContain('animated-post')
    expect(text).toMatch(/ogImage/)
  }, 60_000)
})

describe('drafts in a CI build', () => {
  it.each(['CI', 'WORKERS_CI'])(
    'fails the build naming the draft when %s is set',
    async (variable) => {
      const outcome = await buildScenario('draft', { env: { [variable]: '1' } })

      expect(outcome.error).toBeDefined()
      const text = failureText(outcome.error)
      expect(text).toContain('unfinished-thoughts')
      expect(text).not.toContain('published-post')
    },
    60_000
  )
})

describe('drafts in a plain production build', () => {
  let plain: Awaited<ReturnType<typeof buildScenario>>

  beforeAll(async () => {
    plain = await buildScenario('draft')
  }, 60_000)

  const pageAt = (url: string) =>
    plain.results?.find((result) => result.url === url)

  it('succeeds and warns naming the draft', () => {
    expect(plain.error).toBeUndefined()
    expect(plain.warnings.some((w) => w.includes('unfinished-thoughts'))).toBe(
      true
    )
    expect(plain.warnings.some((w) => w.includes('published-post'))).toBe(false)
  })

  it('writes no page for the draft but still writes the published post', () => {
    expect(plain.error).toBeUndefined()
    expect(pageAt('/writing/published-post/')).toBeDefined()
    expect(pageAt('/writing/unfinished-thoughts/')).toBeUndefined()
    const urls = (plain.results ?? []).map((result) => result.url)
    expect(urls.some((url) => url.includes('unfinished-thoughts'))).toBe(false)
  })

  it('leaves the draft off the index, its tag page and the feed while listing the published post', () => {
    expect(plain.error).toBeUndefined()
    const index = mainOf(pageAt('/writing/')?.content ?? '')
    const tag = mainOf(pageAt('/writing/tags/testing/')?.content ?? '')
    const feed = pageAt('/feed.xml')?.content ?? ''

    for (const html of [index, tag, feed]) {
      expect(html).toContain('Published Post')
      expect(html).not.toContain('Unfinished Thoughts')
      expect(html).not.toContain('unfinished-thoughts')
      expect(html).not.toContain('A post still being written.')
    }
  })
})

describe('drafts under the dev server', () => {
  let served: Awaited<ReturnType<typeof buildScenario>>

  beforeAll(async () => {
    served = await buildScenario('draft', { runMode: 'serve' })
  }, 60_000)

  const pageAt = (url: string) =>
    served.results?.find((result) => result.url === url)
  const marker = /\bDraft\b/
  const visibleText = (html: string) => html.replace(/<[^>]*>/g, ' ')

  function splitAtPublished(html: string) {
    const main = mainOf(html)
    const cut = main.indexOf('href="/writing/published-post/"')
    return { draftSide: main.slice(0, cut), publishedSide: main.slice(cut) }
  }

  it('renders the draft at its own url marked Draft, unlike the published post', () => {
    expect(served.error).toBeUndefined()
    const draftPage = pageAt('/writing/unfinished-thoughts/')
    const publishedPage = pageAt('/writing/published-post/')

    expect(draftPage).toBeDefined()
    expect(visibleText(mainOf(draftPage?.content ?? ''))).toMatch(marker)
    expect(mainOf(draftPage?.content ?? '')).toContain('Unfinished Thoughts')
    expect(publishedPage).toBeDefined()
    expect(visibleText(mainOf(publishedPage?.content ?? ''))).not.toMatch(
      marker
    )
  })

  it.each(['/writing/', '/writing/tags/testing/'])(
    'lists the draft on %s marked Draft while the published post carries no marker',
    (url) => {
      expect(served.error).toBeUndefined()
      const html = pageAt(url)?.content ?? ''
      expect(html).toContain('href="/writing/unfinished-thoughts/"')
      expect(html).toContain('href="/writing/published-post/"')

      const { draftSide, publishedSide } = splitAtPublished(html)
      expect(visibleText(draftSide)).toMatch(marker)
      expect(visibleText(publishedSide)).not.toMatch(marker)
    }
  )

  it('includes the draft in the feed marked Draft while the published entry carries no marker', () => {
    expect(served.error).toBeUndefined()
    const xml = pageAt('/feed.xml')?.content ?? ''
    const { feed } = new XMLParser({
      ignoreAttributes: false,
      parseTagValue: false
    }).parse(xml)
    const entries: Record<string, unknown>[] = [feed?.entry ?? []].flat()
    const draftEntry = entries.find(
      (entry) =>
        entry.id === 'https://michaelmoser.dev/writing/unfinished-thoughts/'
    )
    const publishedEntry = entries.find(
      (entry) => entry.id === 'https://michaelmoser.dev/writing/published-post/'
    )

    expect(draftEntry).toBeDefined()
    expect(JSON.stringify(draftEntry)).toMatch(marker)
    expect(publishedEntry).toBeDefined()
    expect(JSON.stringify(publishedEntry)).not.toMatch(marker)
  })
})

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
