import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import tailwindcss from '@tailwindcss/postcss'
import postcss from 'postcss'

const header =
  '/*! michaelmoser.dev design system — Tailwind v4 · layers: tokens, base, components, utilities */'

const input = join(import.meta.dirname, 'css/site.css')

export async function compileSiteCss(): Promise<string> {
  const source = await readFile(input, 'utf8')
  const result = await postcss([tailwindcss({ optimize: false })]).process(
    source,
    { from: input }
  )
  return `${header}\n${result.css}`
}
