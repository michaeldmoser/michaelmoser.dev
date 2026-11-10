import type { CollectionItem } from '@11ty/eleventy'
import { convertHtmlToAbsoluteUrls } from '@11ty/eleventy-plugin-rss'
import { type FeedSite, renderAtomFeed } from '../lib/feed.ts'

type FeedItem = CollectionItem & { templateContent: string }

async function toFeedPost(site: FeedSite, post: FeedItem) {
  const url = `${site.url}${post.url}`
  return {
    url,
    title:
      post.data.draft === true
        ? `Draft: ${post.data.title}`
        : String(post.data.title),
    date: post.date,
    contentHtml: await convertHtmlToAbsoluteUrls(post.templateContent, url, {
      closingSingleTag: 'slash'
    })
  }
}

export default class Feed {
  data() {
    return { permalink: '/feed.xml', eleventyExcludeFromCollections: true }
  }

  async render(data: { site: FeedSite; collections: { posts: FeedItem[] } }) {
    const posts = await Promise.all(
      data.collections.posts.map((post) => toFeedPost(data.site, post))
    )
    return renderAtomFeed({ site: data.site, posts })
  }
}
