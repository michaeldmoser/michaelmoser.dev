import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { contrastReport } from '../lib/contrast.ts'
import { checkSite } from '../lib/site-check.ts'
import {
  declaredTokens,
  declaredTokenValues,
  resolveColors
} from '../lib/stylesheet.ts'
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

describe('style guide shell colour tokens and contrast table under serve', () => {
  const css = readFileSync(
    join(import.meta.dirname, '..', 'src', '_includes', 'css', 'site.css'),
    'utf8'
  )
  const colorContexts = {
    light: { os: 'light' },
    dark: { os: 'dark' },
    print: { os: 'light', print: true }
  } as const
  const allTokens = declaredTokens(css)
  const primitives = allTokens.filter((name) => name.startsWith('--palette-'))
  const semantics = allTokens.filter((name) => name.startsWith('--color-'))
  const declaredValues = declaredTokenValues(css)
  const tokenPattern = /--[a-z0-9-]+/gi

  let shell = ''

  beforeAll(async () => {
    const { outputDir, error } = await buildScenario('valid', {
      runMode: 'serve',
      write: true
    })
    expect(error).toBeUndefined()
    shell = readFileSync(
      join(outputDir ?? '', 'style-guide', 'index.html'),
      'utf8'
    )
  }, 60_000)

  const textOf = (html: string) =>
    html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&#?\w+;/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase()
  const tokensIn = (text: string): string[] => text.match(tokenPattern) ?? []
  const tablesOf = (html: string) =>
    html.match(/<table\b[\s\S]*?<\/table>/gi) ?? []
  const rowsOf = (html: string) => html.match(/<tr\b[\s\S]*?<\/tr>/gi) ?? []
  const swatchRow = (name: string) =>
    rowsOf(shell)
      .map(textOf)
      .find((text) => {
        const found = new Set(tokensIn(text))
        return found.size === 1 && found.has(name)
      })

  it('shows every semantic colour token with its hex for light, dark and print', () => {
    expect(semantics.length).toBeGreaterThan(0)
    for (const name of semantics) {
      const row = swatchRow(name)
      expect(row, name).toBeDefined()
      for (const [context, resolver] of Object.entries(colorContexts)) {
        const hex = resolveColors(css, resolver)[name]
        expect(hex, `${name} ${context}`).toBeDefined()
        expect(row, `${name} ${context}`).toContain(hex.toLowerCase())
      }
    }
  })

  it('shows every palette primitive with its value once, apart from the per-context semantic tokens', () => {
    expect(primitives.length).toBeGreaterThan(0)
    for (const name of primitives) {
      const value = declaredValues.get(name)
      expect(value, name).toBeDefined()
      expect(swatchRow(name), name).toContain((value ?? '').toLowerCase())
    }

    const primitiveTables = tablesOf(shell).filter((table) =>
      primitives.every((name) => textOf(table).includes(name))
    )
    expect(primitiveTables.length).toBeGreaterThan(0)
    for (const table of primitiveTables) {
      const text = textOf(table)
      expect(tokensIn(text).some((name) => name.startsWith('--color-'))).toBe(
        false
      )
      const headers = (table.match(/<th\b[\s\S]*?<\/th>/gi) ?? [])
        .map(textOf)
        .join(' ')
      expect(headers).not.toMatch(/\b(light|dark|print)\b/)
    }
  })

  it('has one contrast row per report row with its pair, ratio, threshold and verdict', () => {
    const report = contrastReport(css)
    expect(report.length).toBeGreaterThan(0)
    const rows = rowsOf(shell).map(textOf)
    for (const entry of report) {
      const label = `${entry.context} ${entry.foreground} on ${entry.background}`
      const match = rows.find((text) => {
        const found = tokensIn(text)
        const fg = found.indexOf(entry.foreground)
        const bg = found.indexOf(entry.background)
        return (
          found.length === 2 &&
          fg === 0 &&
          bg === 1 &&
          new RegExp(`\\b${entry.context}\\b`).test(text)
        )
      })
      expect(match, label).toBeDefined()
      const numbers = (
        (match ?? '')
          .replace(tokenPattern, ' ')
          .replace(/#[0-9a-f]{3,8}\b/g, ' ')
          .match(/\d+(?:\.\d+)?/g) ?? []
      ).map(Number)
      expect(
        numbers.some((n) => Math.abs(n - entry.ratio) <= 0.01),
        `${label} ratio ${entry.ratio}`
      ).toBe(true)
      expect(numbers, `${label} threshold`).toContain(entry.threshold)
      const verdict = /\b(pass|fail)\w*/.exec(match ?? '')?.[1]
      expect(verdict, label).toBe(entry.pass ? 'pass' : 'fail')
    }
  })
})

describe('style guide pages pass the site check under serve', () => {
  it('reports no validation, reference or class errors for style-guide files', async () => {
    const { outputDir, error } = await buildScenario('valid', {
      runMode: 'serve',
      write: true
    })
    expect(error).toBeUndefined()

    const { errors } = await checkSite(outputDir ?? '', {
      env: {},
      privateTermsPath: fileURLToPath(
        new URL('./fixtures/no-such-private-terms.txt', import.meta.url)
      ),
      contactEmail: 'reachoutto@michaelmoser.dev'
    })

    const offending = errors
      .filter((problem) => problem.file.includes('style-guide'))
      .filter((problem) => !/dev-only/i.test(problem.message))
      .map((problem) => `${problem.file}: ${problem.message}`)
    expect(offending).toEqual([])
  }, 60_000)
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
