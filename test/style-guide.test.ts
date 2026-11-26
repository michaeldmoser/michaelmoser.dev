import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { declaredTokens } from '../lib/stylesheet.ts'
import { buildScenario } from './scenario.ts'

describe('style guide is absent from the production build', () => {
  it('emits no style-guide page, sitemap entry or output file', async () => {
    const { results, error } = await buildScenario('valid')
    expect(error).toBeUndefined()

    const pages = results ?? []
    expect(pages.length).toBeGreaterThan(0)
    for (const result of pages) {
      expect(result.url, result.url).not.toContain('style-guide')
      expect(result.outputPath ?? '', result.url).not.toContain('style-guide')
    }

    const sitemap = pages.find((result) => result.url === '/sitemap.xml')
    expect(sitemap).toBeDefined()
    expect(String(sitemap?.content)).not.toContain('style-guide')
  })

  it('keeps style-guide URLs out of the sitemap in serve mode', async () => {
    const { outputDir, error } = await buildScenario('valid', {
      runMode: 'serve',
      write: true
    })
    expect(error).toBeUndefined()

    const sitemap = readFileSync(join(outputDir ?? '', 'sitemap.xml'), 'utf8')
    expect(sitemap).toContain('<loc>')
    expect(sitemap).not.toContain('/style-guide/')
  })
})

describe('style guide theme frames under serve', () => {
  it.each([
    ['light', 'dark'],
    ['dark', 'light']
  ])('forces the %s theme and ships no theme scripts', async (theme, other) => {
    const { outputDir, error } = await buildScenario('valid', {
      runMode: 'serve',
      write: true
    })
    expect(error).toBeUndefined()
    const dir = outputDir ?? ''

    const home = readFileSync(join(dir, 'index.html'), 'utf8')
    expect(home).toContain('<script')

    const frame = readFileSync(
      join(dir, 'style-guide', theme, 'index.html'),
      'utf8'
    )
    const htmlTag = /<html\b[^>]*>/i.exec(frame)?.[0] ?? ''
    expect(htmlTag).toMatch(
      new RegExp(`\\bdata-theme\\s*=\\s*["']?${theme}\\b`)
    )
    expect(htmlTag).not.toContain(other)
    expect(frame).toMatch(
      /<link\b[^>]*href=["']?\/assets\/css\/site\.css["']?[^>]*>/i
    )
    expect(frame).not.toMatch(/<script\b/i)
    expect(frame).not.toContain('localStorage')
  })
})

describe('style guide theme frame specimens under serve', () => {
  const css = readFileSync(
    join(import.meta.dirname, '..', 'src', '_includes', 'css', 'site.css'),
    'utf8'
  )
  const scaleTokens = declaredTokens(css).filter((name) =>
    /^--(font-size|space)-/.test(name)
  )

  function tokenValue(name: string) {
    const escaped = name.replace(/[-]/g, '\\-')
    return (
      new RegExp(`${escaped}\\s*:\\s*([^;]+);`).exec(css)?.[1]?.trim() ?? ''
    )
  }

  const frames: Record<string, string> = {}

  beforeAll(async () => {
    const { outputDir, error } = await buildScenario('valid', {
      runMode: 'serve',
      write: true
    })
    expect(error).toBeUndefined()
    for (const theme of ['light', 'dark']) {
      frames[theme] = readFileSync(
        join(outputDir ?? '', 'style-guide', theme, 'index.html'),
        'utf8'
      )
    }
  }, 60_000)

  it('declares font-size and space tokens to specimen', () => {
    expect(scaleTokens.length).toBeGreaterThan(0)
    for (const name of scaleTokens) expect(tokenValue(name), name).not.toBe('')
  })

  it.each(['light', 'dark'])(
    'labels every font-size and space token with its name and value in the %s frame',
    (theme) => {
      for (const name of scaleTokens) {
        expect(frames[theme], name).toContain(name)
        expect(frames[theme], name).toContain(tokenValue(name))
      }
    }
  )

  it.each(['light', 'dark'])(
    'shows a link and a focusable button in the %s frame',
    (theme) => {
      expect(frames[theme]).toMatch(/<a\b[^>]*\bhref=/i)
      const buttons = [...frames[theme].matchAll(/<button\b[^>]*>/gi)].map(
        (match) => match[0]
      )
      expect(buttons.length).toBeGreaterThan(0)
      expect(
        buttons.some(
          (tag) =>
            !/\bdisabled\b/i.test(tag) && !/tabindex\s*=\s*["']?-1/i.test(tag)
        )
      ).toBe(true)
    }
  )

  it.each(['light', 'dark'])(
    'shows a Prism code sample with every token kind in the %s frame',
    (theme) => {
      const pre = /<pre\b[\s\S]*?<\/pre>/i.exec(frames[theme])?.[0] ?? ''
      expect(pre).not.toBe('')
      for (const kind of [
        'keyword',
        'string',
        'comment',
        'number',
        'function',
        'punctuation'
      ]) {
        expect(pre, kind).toMatch(
          new RegExp(`<span class="token [^"]*\\b${kind}\\b`)
        )
      }
    }
  )

  it.each(['light', 'dark'])('shows a callout in the %s frame', (theme) => {
    expect(frames[theme]).toMatch(
      /<aside class="callout callout-\w+">[\s\S]*?<\/aside>/
    )
  })
})

describe('style guide shell under serve', () => {
  it('embeds the light and dark theme frames, which both exist', async () => {
    const { outputDir, error } = await buildScenario('valid', {
      runMode: 'serve',
      write: true
    })
    expect(error).toBeUndefined()
    const dir = outputDir ?? ''

    const shell = readFileSync(join(dir, 'style-guide', 'index.html'), 'utf8')
    const sources = [...shell.matchAll(/<iframe\b[^>]*>/gi)].map(
      (match) => /\ssrc\s*=\s*["']?([^"'\s>]+)/i.exec(match[0])?.[1]
    )
    expect(sources).toEqual(['/style-guide/light/', '/style-guide/dark/'])

    for (const theme of ['light', 'dark']) {
      const frame = readFileSync(
        join(dir, 'style-guide', theme, 'index.html'),
        'utf8'
      )
      expect(frame, theme).toContain('<html')
    }
  })
})
