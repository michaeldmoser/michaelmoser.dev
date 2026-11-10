import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cardPalette, renderCard } from '../lib/card.ts'
import { Card } from './_includes/components/card.tsx'

const palette = cardPalette(
  readFileSync(join(import.meta.dirname, 'assets/css/site.css'), 'utf8')
)

const fontsDir = join(import.meta.dirname, '_includes/fonts')
const fonts = {
  regular: readFileSync(join(fontsDir, 'Inter-Regular.ttf')),
  bold: readFileSync(join(fontsDir, 'Inter-Bold.ttf'))
}

export default class DefaultCard {
  data() {
    return {
      permalink: '/og.png',
      layout: false,
      eleventyExcludeFromCollections: true
    }
  }

  async render(data: { site: { title: string; url: string } }) {
    return renderCard(
      Card({
        title: data.site.title,
        siteName: new URL(data.site.url).host,
        palette
      }),
      fonts
    )
  }
}
