import type { CollectionItem } from '@11ty/eleventy'
import { renderSitemap } from '../lib/sitemap.ts'

export default class Sitemap {
  data() {
    return {
      permalink: '/sitemap.xml',
      layout: false,
      eleventyExcludeFromCollections: true
    }
  }

  render(data: {
    site: { url: string }
    collections: { all: CollectionItem[]; posts: CollectionItem[] }
  }) {
    const postUrls = new Set(data.collections.posts.map((post) => post.url))
    const seen = new Set<string>()
    const pages = data.collections.all
      .filter((item) => item.url.endsWith('/') && item.data.noindex !== true)
      .filter((item) => !seen.has(item.url) && seen.add(item.url))
      .map((item) => ({
        url: item.url,
        lastmod: postUrls.has(item.url) ? item.date : undefined
      }))
    return renderSitemap({ siteUrl: data.site.url, pages })
  }
}
