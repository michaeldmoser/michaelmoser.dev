import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cardPalette } from '#lib/card.ts'

const fontsDir = join(import.meta.dirname, 'fonts')

export const fonts = {
  regular: readFileSync(join(fontsDir, 'Inter-Regular.ttf')),
  bold: readFileSync(join(fontsDir, 'Inter-Bold.ttf'))
}

export const palette = cardPalette(
  readFileSync(join(import.meta.dirname, '../assets/css/site.css'), 'utf8')
)
