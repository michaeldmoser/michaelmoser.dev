import type { CollectionItem } from '@11ty/eleventy'
import { renderCard } from '../lib/card.ts'
import { fonts, palette } from './_includes/card-assets.ts'
import { Card } from './_includes/components/card.tsx'

export default class PostCard {
  data() {
    return {
      pagination: {
        data: 'collections.posts',
        size: 1,
        alias: 'post',
        before: (posts: CollectionItem[]) =>
          posts.filter((post) => !post.data.ogImage)
      },
      permalink: (data: { post: CollectionItem }) => `${data.post.url}og.png`,
      eleventyExcludeFromCollections: true
    }
  }

  async render(data: {
    post: CollectionItem
    site: { url: string; author: { name: string } }
  }) {
    return renderCard(
      Card({
        title: String(data.post.data.title),
        name: data.site.author.name,
        domain: new URL(data.site.url).host,
        palette
      }),
      fonts
    )
  }
}
