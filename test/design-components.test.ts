import type { BuildResult } from '@11ty/eleventy'
import postcss, { type AtRule, type Container, type Rule } from 'postcss'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildScenario } from './scenario'

let results: BuildResult[]
let stylesheet: string

beforeAll(async () => {
  const outcome = await buildScenario('valid')
  if (outcome.error) throw outcome.error
  results = outcome.results ?? []
  stylesheet =
    results.find((result) => result.url === '/assets/css/site.css')?.content ??
    ''
  if (!stylesheet) throw new Error('site.css was not built')
}, 60_000)

function classesOf(tag: string) {
  return (tag.match(/\sclass="([^"]*)"/)?.[1] ?? '').split(/\s+/)
}

function firstTag(html: string, name: string) {
  return html.match(new RegExp(`<${name}[\\s>][^>]*>?`))?.[0] ?? ''
}

function toggleTag(html: string) {
  return (
    html
      .match(/<button\b[^>]*>/g)
      ?.find((tag) => /\bid="theme-toggle"/.test(tag)) ?? ''
  )
}

function layersOf(node: Container | undefined) {
  const layers: string[] = []
  let current: Container | undefined = node
  while (current && current.type !== 'root') {
    if (current.type === 'atrule' && (current as AtRule).name === 'layer') {
      layers.push((current as AtRule).params.trim())
    }
    current = current.parent as Container | undefined
  }
  return layers
}

function selectorsInLayer(layer: string) {
  const selectors: string[] = []
  postcss.parse(stylesheet).walkRules((rule: Rule) => {
    if (layersOf(rule.parent as Container).includes(layer)) {
      selectors.push(...rule.selectors)
    }
  })
  return selectors
}

const pages = () =>
  results.filter((result) => result.outputPath.endsWith('.html'))

describe('component classes in built markup', () => {
  it('puts the shell component classes on the header, nav, theme toggle and footer of every page', () => {
    expect(pages().length).toBeGreaterThan(0)
    for (const page of pages()) {
      const html = page.content
      const where = page.outputPath
      expect(classesOf(firstTag(html, 'header')), where).toContain(
        'site-header'
      )
      expect(classesOf(firstTag(html, 'nav')), where).toEqual(
        expect.arrayContaining(['site-nav', 'no-print'])
      )
      expect(classesOf(firstTag(html, 'footer')), where).toContain(
        'site-footer'
      )
      expect(classesOf(toggleTag(html)), where).toEqual(
        expect.arrayContaining(['theme-toggle', 'no-print'])
      )
    }
  })

  it('puts post-list on the writing index list and prose on the post body', () => {
    const index = results.find((result) => result.url === '/writing/')
    const post = results.find(
      (result) => result.url === '/writing/shipping-small-batches/'
    )
    expect(index?.content).toMatch(/\sclass="[^"]*\bpost-list\b[^"]*"/)
    expect(post?.content).toMatch(/\sclass="[^"]*\bprose\b[^"]*"/)
  })
})

describe('compiled stylesheet layers', () => {
  it.each([
    'site-header',
    'site-nav',
    'site-footer',
    'theme-toggle',
    'post-list',
    'prose'
  ])('defines the %s class inside the components layer', (name) => {
    const selectors = selectorsInLayer('components')
    expect(
      selectors.some((selector) =>
        new RegExp(`\\.${name}(?![\\w-])`).test(selector)
      )
    ).toBe(true)
  })

  it.each(['body', 'a', 'h1', 'h2', 'hr'])(
    'defines the %s element default inside the base layer',
    (element) => {
      expect(selectorsInLayer('base')).toContain(element)
    }
  )

  it('defines focus-visible rules inside the base layer', () => {
    expect(
      selectorsInLayer('base').some((selector) =>
        selector.includes(':focus-visible')
      )
    ).toBe(true)
  })
})
