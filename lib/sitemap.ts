export type SitemapPage = {
  url: string
  lastmod?: Date
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

function renderUrl(siteUrl: string, page: SitemapPage): string {
  return [
    '  <url>',
    `    <loc>${escapeXml(`${siteUrl}${page.url}`)}</loc>`,
    ...(page.lastmod
      ? [`    <lastmod>${page.lastmod.toISOString()}</lastmod>`]
      : []),
    '  </url>'
  ].join('\n')
}

export function renderSitemap(input: {
  siteUrl: string
  pages: SitemapPage[]
}): string {
  const lines = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...input.pages.map((page) => renderUrl(input.siteUrl, page)),
    '</urlset>'
  ]
  return `${lines.join('\n')}\n`
}
