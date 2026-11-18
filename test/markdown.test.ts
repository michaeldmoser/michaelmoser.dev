import type { BuildResult } from '@11ty/eleventy'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildScenario } from './scenario'

let results: BuildResult[]

beforeAll(async () => {
  const outcome = await buildScenario('markdown')
  if (outcome.error) throw outcome.error
  results = outcome.results ?? []
}, 60_000)

describe('markdown pages', () => {
  it('renders a markdown page as a full HTML document with the markdown body as unescaped HTML inside main', () => {
    const page = results.find((result) => result.url === '/markdown-check/')

    expect(page).toBeDefined()
    const html = page?.content ?? ''
    expect(html.toLowerCase()).toContain('<!doctype html>')
    const main = html.match(/<main>([\s\S]*)<\/main>/)
    expect(main).not.toBeNull()
    expect(main?.[1]).toContain('<h1')
    expect(main?.[1]).not.toContain('&lt;h1')
  })

  it('keeps a literal {{ page.url }} in the markdown verbatim instead of rendering it', () => {
    const page = results.find((result) => result.url === '/markdown-check/')

    expect(page).toBeDefined()
    expect(page?.content).toContain('<code>{{ page.url }}</code>')
  })
})
