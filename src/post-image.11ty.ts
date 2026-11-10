import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { CollectionItem } from '@11ty/eleventy'

export default class PostImage {
  data() {
    return {
      pagination: {
        data: 'collections.posts',
        size: 1,
        alias: 'post',
        before: (posts: CollectionItem[]) =>
          posts.filter((post) => post.data.ogImage)
      },
      permalink: (data: { post: CollectionItem }) =>
        `${data.post.url}${data.post.data.ogImage}`,
      eleventyExcludeFromCollections: true
    }
  }

  async render(data: { post: CollectionItem }) {
    return readFile(
      join(dirname(data.post.inputPath), String(data.post.data.ogImage))
    )
  }
}
