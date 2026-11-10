import { convertHtmlToAbsoluteUrls } from '@11ty/eleventy-plugin-rss'
import { renderAtomFeed } from '../lib/feed.ts'

async function toFeedPost(site, post) {
  const url = `${site.url}${post.url}`
  return {
    url,
    title: post.data.title,
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

  async render(data) {
    const posts = await Promise.all(
      data.collections.posts.map((post) => toFeedPost(data.site, post))
    )
    return renderAtomFeed({ site: data.site, posts })
  }
}
