import { register } from 'tsx/esm/api'
import { beforeAll, describe, expect, it } from 'vitest'

interface BuildResult {
  url: string
  content: string
}

const header =
  '/*! michaelmoser.dev design system — Tailwind v4 · layers: tokens, base, components, utilities */'

let stylesheet: string

beforeAll(async () => {
  register()
  const { default: Eleventy } = await import('@11ty/eleventy')
  const results: BuildResult[] = await new Eleventy('src', '_site', {
    configPath: 'eleventy.config.ts'
  }).toJSON()
  stylesheet =
    results.find((result) => result.url === '/assets/css/site.css')?.content ??
    ''
}, 60_000)

describe('built stylesheet', () => {
  it('opens with the design system header', () => {
    expect(stylesheet.startsWith(header)).toBe(true)
  })

  it('is not minified and keeps one declaration per line', () => {
    const lines = stylesheet.split('\n')
    expect(lines.length).toBeGreaterThan(20)
    const crowded = lines.filter((line) => /;\s*[-\w]+\s*:/.test(line))
    expect(crowded).toEqual([])
  })

  it('declares the layers in the order tokens, base, components, utilities', () => {
    expect(stylesheet).toMatch(
      /@layer\s+tokens\s*,\s*base\s*,\s*components\s*,\s*utilities\s*;/
    )
  })
})
