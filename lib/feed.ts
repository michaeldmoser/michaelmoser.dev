export type FeedSite = {
  url: string
  title: string
  feedTitle: string
  author: { name: string }
  feedUpdatedFallback: string
}

export type FeedPost = {
  url: string
  title: string
  date: Date
  contentHtml: string
}

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;'
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => XML_ESCAPES[char])
}

function renderEntry(post: FeedPost): string {
  return [
    '  <entry>',
    `    <id>${escapeXml(post.url)}</id>`,
    `    <title>${escapeXml(post.title)}</title>`,
    `    <updated>${post.date.toISOString()}</updated>`,
    `    <link rel="alternate" href="${escapeXml(post.url)}"/>`,
    `    <content type="html">${escapeXml(post.contentHtml)}</content>`,
    '  </entry>'
  ].join('\n')
}

function feedUpdated(site: FeedSite, posts: FeedPost[]): string {
  if (posts.length === 0) {
    return site.feedUpdatedFallback
  }
  const newest = Math.max(...posts.map((post) => post.date.getTime()))
  return new Date(newest).toISOString()
}

export function renderAtomFeed(input: {
  site: FeedSite
  posts: FeedPost[]
}): string {
  const { site, posts } = input
  const feedUrl = `${site.url}/feed.xml`
  const lines = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    `  <id>${escapeXml(feedUrl)}</id>`,
    `  <title>${escapeXml(site.feedTitle)}</title>`,
    `  <updated>${escapeXml(feedUpdated(site, posts))}</updated>`,
    `  <link rel="self" href="${escapeXml(feedUrl)}"/>`,
    `  <link rel="alternate" href="${escapeXml(site.url)}"/>`,
    `  <author><name>${escapeXml(site.author.name)}</name></author>`,
    ...posts.map(renderEntry),
    '</feed>'
  ]
  return `${lines.join('\n')}\n`
}
