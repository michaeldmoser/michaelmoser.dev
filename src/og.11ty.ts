import { renderCard } from '../lib/card.ts'
import { fonts, palette } from './_includes/card-assets.ts'
import { Card } from './_includes/components/card.tsx'

export default class DefaultCard {
  data() {
    return {
      permalink: '/og.png',
      layout: false,
      eleventyExcludeFromCollections: true
    }
  }

  async render(data: {
    site: { description: string; url: string; author: { name: string } }
  }) {
    return renderCard(
      Card({
        title: data.site.description,
        name: data.site.author.name,
        domain: new URL(data.site.url).host,
        palette
      }),
      fonts
    )
  }
}
