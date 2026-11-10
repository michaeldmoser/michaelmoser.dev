import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CollectionItem } from '@11ty/eleventy'
import { renderCard } from '../lib/card.ts'
import { Card } from './_includes/components/card.tsx'

const fontsDir = join(import.meta.dirname, '_includes/fonts')
const fonts = {
  regular: readFileSync(join(fontsDir, 'Inter-Regular.ttf')),
  bold: readFileSync(join(fontsDir, 'Inter-Bold.ttf'))
}

export default class PostCard {
  data() {
    return {
      pagination: { data: 'collections.posts', size: 1, alias: 'post' },
      permalink: (data: { post: CollectionItem }) => `${data.post.url}og.png`,
      eleventyExcludeFromCollections: true
    }
  }

  async render(data: { post: CollectionItem; site: { title: string } }) {
    return renderCard(
      Card({ title: String(data.post.data.title), siteName: data.site.title }),
      fonts
    )
  }
}
