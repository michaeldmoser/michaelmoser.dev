import { XMLParser, XMLValidator } from 'fast-xml-parser'
import { describe, expect, it } from 'vitest'
import { renderAtomFeed } from '../lib/feed.ts'

interface ParsedLink {
  '@_href'?: string
  '@_rel'?: string
}

interface ParsedEntry {
  id: string
  title: string
  updated: string
  link: ParsedLink | ParsedLink[]
  content: { '@_type': string; '#text': string }
}

const site = {
  url: 'https://michaelmoser.dev',
  title: 'Michael Moser',
  feedTitle: 'Michael Moser — Writing',
  author: { name: 'Michael Moser' },
  feedUpdatedFallback: '2026-01-01T00:00:00Z'
}

const trickyHtml = '<p class="lead">Tom & Jerry said "hi" & it\'s 1 < 2</p>'

const newer = {
  url: 'https://michaelmoser.dev/writing/newer/',
  title: 'Newer & Better "Post"',
  date: new Date('2026-06-15'),
  contentHtml: trickyHtml
}

const older = {
  url: 'https://michaelmoser.dev/writing/older/',
  title: 'Older Post',
  date: new Date('2026-02-03'),
  contentHtml: '<p>Plain</p>'
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false,
  trimValues: false
})

function parseFeed(xml: string) {
  return parser.parse(xml).feed
}

function asArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value]
}

describe('renderAtomFeed with no posts', () => {
  const xml = renderAtomFeed({ site, posts: [] })
  const feed = parseFeed(xml)

  it('is well-formed XML', () => {
    expect(XMLValidator.validate(xml)).toBe(true)
  })

  it('carries the required feed elements with the site metadata', () => {
    expect(feed['@_xmlns']).toBe('http://www.w3.org/2005/Atom')
    expect(feed.id).toBe('https://michaelmoser.dev/feed.xml')
    expect(feed.title).toBe('Michael Moser — Writing')
    expect(feed.author.name).toBe('Michael Moser')
    expect(feed.entry).toBeUndefined()
  })

  it('dates the empty feed with the site fallback', () => {
    expect(new Date(feed.updated).getTime()).toBe(
      new Date('2026-01-01T00:00:00Z').getTime()
    )
  })

  it('has no author email', () => {
    expect(feed.author.email).toBeUndefined()
    expect(xml).not.toContain('<email')
  })
})

describe('renderAtomFeed with several posts', () => {
  const xml = renderAtomFeed({ site, posts: [newer, older] })
  const feed = parseFeed(xml)
  const entries = asArray<ParsedEntry>(feed.entry)

  it('is well-formed XML', () => {
    expect(XMLValidator.validate(xml)).toBe(true)
  })

  it('dates the feed from the newest post', () => {
    expect(new Date(feed.updated).getTime()).toBe(newer.date.getTime())
  })

  it('emits one entry per post with id, title, updated and an alternate link', () => {
    expect(entries).toHaveLength(2)
    for (const [entry, post] of [
      [entries[0], newer],
      [entries[1], older]
    ] as const) {
      expect(entry.id).toBe(post.url)
      expect(entry.title).toBe(post.title)
      expect(new Date(entry.updated).getTime()).toBe(post.date.getTime())
      const links = asArray<ParsedLink>(entry.link)
      expect(
        links.some(
          (link) => link['@_href'] === post.url && link['@_rel'] === 'alternate'
        )
      ).toBe(true)
    }
  })

  it('round-trips content HTML through escaped html content', () => {
    const content = entries[0].content
    expect(content['@_type']).toBe('html')
    expect(content['#text']).toBe(trickyHtml)
    expect(entries[1].content['#text']).toBe('<p>Plain</p>')
  })

  it('has no author email', () => {
    expect(xml).not.toContain('<email')
  })
})
