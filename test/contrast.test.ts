import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrastRatio, contrastReport } from '../lib/contrast.ts'
import { resolveColors } from '../lib/stylesheet.ts'

describe('contrastRatio', () => {
  it('gives 21 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
  })

  it('gives 1 for identical colors', () => {
    expect(contrastRatio('#336699', '#336699')).toBeCloseTo(1, 5)
  })

  it('gives the same ratio in either argument order', () => {
    expect(contrastRatio('#336699', '#ffeecc')).toBeCloseTo(
      contrastRatio('#ffeecc', '#336699'),
      10
    )
  })

  it('computes the WCAG ratio for mid grey on white', () => {
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 1)
  })

  it('computes the WCAG ratio for pure blue on white', () => {
    expect(contrastRatio('#0000ff', '#ffffff')).toBeCloseTo(8.59, 1)
  })
})

const reportCss = [
  ':root {',
  'color-scheme: light dark;',
  '--color-surface: light-dark(#ffffff, #000000);',
  '--color-code-surface: light-dark(#ffffff, #000000);',
  '--color-callout-surface: light-dark(#ffffff, #000000);',
  '--color-text: light-dark(#000000, #ffffff);',
  '--color-link: light-dark(#777777, #ffffff);',
  '--color-code-keyword: light-dark(#000000, #ffffff);',
  '--color-code-string: light-dark(#000000, #ffffff);',
  '--color-code-comment: light-dark(#000000, #ffffff);',
  '--color-code-number: light-dark(#000000, #ffffff);',
  '--color-code-function: light-dark(#000000, #ffffff);',
  '--color-code-punctuation: light-dark(#000000, #ffffff);',
  '--color-callout-label: light-dark(#000000, #ffffff);',
  '--color-focus: light-dark(#000000, #ffffff);',
  '--color-border: light-dark(#000000, #ffffff);',
  '}',
  '@media print { :root { --color-text: #666666; } }'
].join('\n')

const reportPairs = [
  ['--color-text', '--color-surface'],
  ['--color-link', '--color-surface'],
  ['--color-code-keyword', '--color-code-surface'],
  ['--color-code-string', '--color-code-surface'],
  ['--color-code-comment', '--color-code-surface'],
  ['--color-code-number', '--color-code-surface'],
  ['--color-code-function', '--color-code-surface'],
  ['--color-code-punctuation', '--color-code-surface'],
  ['--color-callout-label', '--color-callout-surface'],
  ['--color-focus', '--color-surface'],
  ['--color-border', '--color-surface']
]

const reportContexts = {
  light: { os: 'light' },
  dark: { os: 'dark' },
  print: { os: 'light', print: true }
} as const

const rowFor = (context: string, foreground: string) => {
  const row = contrastReport(reportCss).find(
    (r) => r.context === context && r.foreground === foreground
  )
  if (!row) throw new Error(`no row for ${context} ${foreground}`)
  return row
}

describe('contrastReport', () => {
  it('has one row per context and agreed foreground-background pair', () => {
    const expected = Object.keys(reportContexts).flatMap((context) =>
      reportPairs.map(([fg, bg]) => `${context}|${fg}|${bg}`)
    )
    const actual = contrastReport(reportCss).map(
      (r) => `${r.context}|${r.foreground}|${r.background}`
    )
    expect(actual.sort()).toEqual(expected.sort())
  })

  it('resolves each row hexes for its context and computes the ratio from them', () => {
    for (const row of contrastReport(reportCss)) {
      const colors = resolveColors(reportCss, reportContexts[row.context])
      expect(row.foregroundHex).toBe(colors[row.foreground])
      expect(row.backgroundHex).toBe(colors[row.background])
      expect(row.ratio).toBeCloseTo(
        contrastRatio(row.foregroundHex, row.backgroundHex),
        10
      )
    }
  })

  it('uses 4.5 for text pairs, 3 for non-text pairs, and 7 for print text', () => {
    expect(rowFor('light', '--color-text').threshold).toBe(4.5)
    expect(rowFor('dark', '--color-text').threshold).toBe(4.5)
    expect(rowFor('print', '--color-text').threshold).toBe(7)
    expect(rowFor('print', '--color-link').threshold).toBe(4.5)
    expect(rowFor('light', '--color-code-keyword').threshold).toBe(4.5)
    expect(rowFor('dark', '--color-callout-label').threshold).toBe(4.5)
    expect(rowFor('light', '--color-focus').threshold).toBe(3)
    expect(rowFor('print', '--color-border').threshold).toBe(3)
  })

  it('marks a row as passing only when its ratio meets its threshold', () => {
    expect(rowFor('light', '--color-text').pass).toBe(true)
    expect(rowFor('dark', '--color-link').pass).toBe(true)
    expect(rowFor('light', '--color-link').pass).toBe(false)
    expect(rowFor('print', '--color-text').pass).toBe(false)
    for (const row of contrastReport(reportCss)) {
      expect(row.pass).toBe(row.ratio >= row.threshold)
    }
  })
})

describe('contrastReport with an unresolved pair token', () => {
  const missingBorderCss = reportCss
    .split('\n')
    .filter((line) => !line.startsWith('--color-border:'))
    .join('\n')

  it('throws an error naming the token and the context instead of dropping the row', () => {
    expect(() => contrastReport(missingBorderCss)).toThrow(
      /--color-border.*\b(light|dark|print)\b|\b(light|dark|print)\b.*--color-border/
    )
  })
})

describe('contrastReport on the shipped stylesheet', () => {
  const siteCss = readFileSync(
    resolve(import.meta.dirname, '../src/_includes/css/site.css'),
    'utf8'
  )
  const rows = contrastReport(siteCss)

  it('has exactly one row for every context and agreed pair', () => {
    const expected = Object.keys(reportContexts).flatMap((context) =>
      reportPairs.map(([fg, bg]) => `${context}|${fg}|${bg}`)
    )
    const actual = rows.map(
      (r) => `${r.context}|${r.foreground}|${r.background}`
    )
    expect(expected).toHaveLength(33)
    expect(actual.sort()).toEqual(expected.sort())
  })

  it('passes every row', () => {
    for (const row of rows) {
      expect(
        row.pass,
        `${row.context} ${row.foreground} on ${row.background}: ${row.ratio.toFixed(2)} < ${row.threshold}`
      ).toBe(true)
    }
  })
})
