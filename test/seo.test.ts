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
