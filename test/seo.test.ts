import { beforeAll, describe, expect, it } from 'vitest'
import { buildScenario } from './scenario.ts'

interface BuildResult {
  url: string
  content: string
}

let seo: { results?: BuildResult[]; error?: Error }

beforeAll(async () => {
  seo = await buildScenario('seo')
}, 60_000)

const pageUrls = [
  '/',
  '/about/',
  '/writing/',
  '/writing/first-post/',
  '/writing/second-post/',
  '/writing/tags/testing/'
]

function headOf(url: string) {
  const html = seo.results?.find((result) => result.url === url)?.content ?? ''
  return html.match(/<head[\s>]([\s\S]*?)<\/head>/)?.[1] ?? ''
}

function metaContent(head: string, attribute: 'name' | 'property', key: string) {
  const tags = head.match(/<meta\b[^>]*>/g) ?? []
  const tag = tags.find((candidate) =>
    new RegExp(`\\s${attribute}="${key}"`).test(candidate)
  )
  return tag?.match(/\scontent="([^"]*)"/)?.[1]
}

function titleOf(head: string) {
  return head.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]?.trim()
}

function canonicalOf(head: string) {
  const link = (head.match(/<link\b[^>]*>/g) ?? []).find((candidate) =>
    /\srel="canonical"/.test(candidate)
  )
  return link?.match(/\shref="([^"]*)"/)?.[1]
}

describe('search and share metadata', () => {
  it.each(pageUrls)(
    'gives %s a title, description, absolute canonical url and the full open graph and twitter set',
    (url) => {
      expect(seo.error).toBeUndefined()
      const head = headOf(url)

      expect(head).not.toBe('')
      expect(titleOf(head)).toBeTruthy()
      expect(metaContent(head, 'name', 'description')).toBeTruthy()
      expect(canonicalOf(head)).toBe(`https://michaelmoser.dev${url}`)
      expect(metaContent(head, 'property', 'og:title')).toBeTruthy()
      expect(metaContent(head, 'property', 'og:description')).toBeTruthy()
      expect(metaContent(head, 'property', 'og:url')).toBe(
        `https://michaelmoser.dev${url}`
      )
      expect(metaContent(head, 'property', 'og:image')).toMatch(
        /^https:\/\/michaelmoser\.dev\/\S+/
      )
      expect(metaContent(head, 'property', 'og:type')).toBeTruthy()
      expect(metaContent(head, 'property', 'og:site_name')).toBeTruthy()
      expect(metaContent(head, 'name', 'twitter:card')).toBe(
        'summary_large_image'
      )
    }
  )

  it.each([
    ['/writing/first-post/', 'The First Post'],
    ['/writing/second-post/', 'The Second Post']
  ])(
    'titles the post at %s with the site name, shares its bare title and types it as an article',
    (url, postTitle) => {
      expect(seo.error).toBeUndefined()
      const head = headOf(url)

      expect(titleOf(head)).toBe(`${postTitle} — Michael Moser`)
      expect(metaContent(head, 'property', 'og:title')).toBe(postTitle)
      expect(metaContent(head, 'property', 'og:type')).toBe('article')
      expect(metaContent(head, 'property', 'og:site_name')).toBe(
        'Michael Moser'
      )
    }
  )

  it.each(['/', '/about/', '/writing/', '/writing/tags/testing/'])(
    'types %s as a website',
    (url) => {
      expect(seo.error).toBeUndefined()

      expect(metaContent(headOf(url), 'property', 'og:type')).toBe('website')
    }
  )

  it('titles the home page just Michael Moser', () => {
    expect(seo.error).toBeUndefined()

    expect(titleOf(headOf('/'))).toBe('Michael Moser')
  })
})

function robotsOf(head: string) {
  return metaContent(head, 'name', 'robots')
}

describe('noindex', () => {
  it('marks the 404 page noindex while giving it the full tag set', () => {
    expect(seo.error).toBeUndefined()
    const head = headOf('/404.html')

    expect(head).not.toBe('')
    expect(robotsOf(head)).toBe('noindex')
    expect(titleOf(head)).toBeTruthy()
    expect(metaContent(head, 'name', 'description')).toBeTruthy()
    expect(canonicalOf(head)).toMatch(/^https:\/\/michaelmoser\.dev\/\S*$/)
    expect(metaContent(head, 'property', 'og:title')).toBeTruthy()
    expect(metaContent(head, 'property', 'og:description')).toBeTruthy()
    expect(metaContent(head, 'property', 'og:url')).toMatch(
      /^https:\/\/michaelmoser\.dev\/\S*$/
    )
    expect(metaContent(head, 'property', 'og:image')).toMatch(
      /^https:\/\/michaelmoser\.dev\/\S+/
    )
    expect(metaContent(head, 'property', 'og:type')).toBe('website')
    expect(metaContent(head, 'property', 'og:site_name')).toBeTruthy()
    expect(metaContent(head, 'name', 'twitter:card')).toBe(
      'summary_large_image'
    )
  })

  it.each(pageUrls)('does not noindex %s', (url) => {
    expect(seo.error).toBeUndefined()

    expect(headOf(url)).not.toBe('')
    expect(robotsOf(headOf(url))).toBeUndefined()
  })
})

function jsonLdScripts(head: string) {
  return (
    head.match(
      /<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g
    ) ?? []
  )
}

function scriptBody(script: string) {
  return script.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '')
}

function jsonLdBlocks(head: string) {
  return jsonLdScripts(head).map((script) => JSON.parse(scriptBody(script)))
}

describe('BlogPosting structured data', () => {
  it.each([
    ['/writing/first-post/', 'The First Post', '2026-03-02T00:00:00Z', 'A description for the first post.'],
    ['/writing/second-post/', 'The Second Post', '2026-05-15T00:00:00Z', 'A description for the second post.']
  ])(
    'gives the post at %s exactly one BlogPosting block describing it',
    (url, title, date, description) => {
      expect(seo.error).toBeUndefined()
      const head = headOf(url)
      const blocks = jsonLdBlocks(head).filter(
        (block) => block['@type'] === 'BlogPosting'
      )

      expect(blocks).toHaveLength(1)
      const posting = blocks[0]
      expect(posting['@context']).toMatch(/^https?:\/\/schema\.org\/?$/)
      expect(posting.headline).toBe(title)
      expect(posting.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2}))?$/)
      expect(Date.parse(posting.datePublished)).toBe(Date.parse(date))
      expect(posting.url).toBe(canonicalOf(head))
      expect(posting.url).toBe(`https://michaelmoser.dev${url}`)
      expect(posting.image).toBe(metaContent(head, 'property', 'og:image'))
      expect(posting.description).toBe(description)
      expect(posting.author).toMatchObject({
        '@type': 'Person',
        name: 'Michael Moser',
        url: 'https://michaelmoser.dev'
      })
      expect(posting.mainEntityOfPage).toBeTruthy()
    }
  )
})

describe('structured data escaping', () => {
  it('keeps script-closing and comment sequences in a title and description from escaping the JSON-LD block', () => {
    expect(seo.error).toBeUndefined()
    const html =
      seo.results?.find((result) => result.url === '/writing/hostile-post/')
        ?.content ?? ''
    const head = headOf('/writing/hostile-post/')
    const bodies = jsonLdScripts(head).map(scriptBody)

    expect(html).not.toBe('')
    expect(bodies.length).toBeGreaterThan(0)
    for (const body of bodies) {
      expect(body).not.toMatch(/<\/script/i)
      expect(body).not.toMatch(/<!--/)
    }
    const posting = jsonLdBlocks(head).find(
      (block) => block['@type'] === 'BlogPosting'
    )
    expect(posting?.headline).toBe('Breaking </script> and <!-- out')
    expect(posting?.description).toBe(
      'Ends with </SCRIPT><b>x</b> then <!-- opens a comment'
    )
  })
})

function topLevelNodes(head: string) {
  return jsonLdBlocks(head).flatMap((block) =>
    Array.isArray(block['@graph']) ? block['@graph'] : [block]
  )
}

function personsOf(head: string) {
  return topLevelNodes(head).filter((node) => node['@type'] === 'Person')
}

describe('Person structured data', () => {
  it.each(['/', '/about/'])(
    'gives %s one Person block describing Michael Moser',
    (url) => {
      expect(seo.error).toBeUndefined()
      const persons = personsOf(headOf(url))

      expect(persons).toHaveLength(1)
      expect(persons[0]).toMatchObject({
        name: 'Michael Moser',
        jobTitle: 'Staff Software Engineer',
        url: 'https://michaelmoser.dev',
        sameAs: [
          'https://www.linkedin.com/in/michaeldmoser/',
          'https://github.com/michaeldmoser'
        ],
        worksFor: {
          '@type': 'Organization',
          name: 'Uplisting',
          url: 'https://uplisting.io'
        }
      })
      expect(persons[0]).not.toHaveProperty('image')
    }
  )

  it.each([
    '/writing/',
    '/writing/first-post/',
    '/writing/second-post/',
    '/writing/tags/testing/',
    '/404.html'
  ])('gives %s no top-level Person block', (url) => {
    expect(seo.error).toBeUndefined()
    const head = headOf(url)

    expect(head).not.toBe('')
    expect(personsOf(head)).toEqual([])
  })

  it.each([...pageUrls, '/404.html'])(
    'exposes no email address in the structured data or meta tags of %s',
    (url) => {
      expect(seo.error).toBeUndefined()
      const head = headOf(url)
      const scripts = jsonLdScripts(head)
      const metas = head.match(/<meta\b[^>]*>/g) ?? []

      expect(head).not.toBe('')
      expect([...scripts, ...metas].join('\n')).not.toMatch(
        /[\w.+-]+(@|%40|&#64;|&#x40;)[\w-]+\.[\w.-]+/i
      )
    }
  )
})

describe('meta description', () => {
  const siteDescription =
    'Michael Moser is a Staff Software Engineer writing about building and running software.'

  it.each([
    ['/writing/first-post/', 'A description for the first post.'],
    ['/writing/second-post/', 'A description for the second post.']
  ])('shows the frontmatter description on the post at %s', (url, expected) => {
    expect(seo.error).toBeUndefined()

    expect(metaContent(headOf(url), 'name', 'description')).toBe(expected)
  })

  it('shows "Posts about <Label> by Michael Moser" on a tag page', () => {
    expect(seo.error).toBeUndefined()

    expect(
      metaContent(headOf('/writing/tags/testing/'), 'name', 'description')
    ).toBe('Posts about Testing Practices by Michael Moser')
  })

  it('shows its own frontmatter description on a page that has one', () => {
    expect(seo.error).toBeUndefined()

    expect(metaContent(headOf('/about/'), 'name', 'description')).toBe(
      'About the author of this site.'
    )
  })

  it.each(['/', '/writing/'])(
    'falls back to the site description on %s, which has none of its own',
    (url) => {
      expect(seo.error).toBeUndefined()

      expect(metaContent(headOf(url), 'name', 'description')).toBe(
        siteDescription
      )
    }
  )
})
