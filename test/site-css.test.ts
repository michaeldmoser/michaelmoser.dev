import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { contrastRatio } from '../lib/contrast.ts'
import {
  declaredTokens,
  findRawValues,
  resolveColors
} from '../lib/stylesheet.ts'

const css = readFileSync(
  new URL('../src/assets/css/site.css', import.meta.url),
  'utf8'
)

describe('site css tokens', () => {
  it('has no raw color, size, or measure values outside the token blocks', () => {
    expect(findRawValues(css)).toEqual([])
  })

  it('declares the required color tokens', () => {
    expect(declaredTokens(css)).toEqual(
      expect.arrayContaining([
        '--color-text',
        '--color-bg',
        '--color-link',
        '--color-accent',
        '--color-focus',
        '--color-border'
      ])
    )
  })

  it('declares font size, spacing, and measure tokens', () => {
    const tokens = declaredTokens(css)
    expect(tokens.some((name) => name.startsWith('--font-size-'))).toBe(true)
    expect(tokens.some((name) => name.startsWith('--space-'))).toBe(true)
    expect(tokens).toContain('--measure')
  })
})

describe('site css theme selection', () => {
  it('applies the dark palette when the OS is dark and no theme is chosen', () => {
    expect(resolveColors(css, { os: 'dark' })).toEqual(
      resolveColors(css, { os: 'light', theme: 'dark' })
    )
  })

  it('applies the light palette when the OS is light and no theme is chosen', () => {
    expect(resolveColors(css, { os: 'light' })).toEqual(
      resolveColors(css, { os: 'dark', theme: 'light' })
    )
  })

  it('gives the light and dark palettes different backgrounds', () => {
    const light = resolveColors(css, { os: 'light' })
    const dark = resolveColors(css, { os: 'dark' })
    expect(light['--color-bg']).toBeDefined()
    expect(dark['--color-bg']).toBeDefined()
    expect(light['--color-bg']).not.toBe(dark['--color-bg'])
  })
})

type Palette = {
  os: 'light' | 'dark'
  theme?: 'light' | 'dark'
}

const screenPalettes: [string, Palette][] = [
  ['light OS', { os: 'light' }],
  ['dark OS', { os: 'dark' }],
  ['chosen light theme', { os: 'dark', theme: 'light' }],
  ['chosen dark theme', { os: 'light', theme: 'dark' }]
]

const printPalettes: [string, Palette][] = [
  ['light OS and no theme', { os: 'light' }],
  ['light OS and light theme', { os: 'light', theme: 'light' }],
  ['light OS and dark theme', { os: 'light', theme: 'dark' }],
  ['dark OS and no theme', { os: 'dark' }],
  ['dark OS and light theme', { os: 'dark', theme: 'light' }],
  ['dark OS and dark theme', { os: 'dark', theme: 'dark' }]
]

describe('site css contrast', () => {
  it.each(screenPalettes)(
    'body text and links meet AA contrast against the background for %s',
    (_label, palette) => {
      const colors = resolveColors(css, palette)
      expect(
        contrastRatio(colors['--color-text'], colors['--color-bg'])
      ).toBeGreaterThanOrEqual(4.5)
      expect(
        contrastRatio(colors['--color-link'], colors['--color-bg'])
      ).toBeGreaterThanOrEqual(4.5)
    }
  )

  it.each(printPalettes)(
    'print uses a white background with high contrast text for %s',
    (_label, palette) => {
      const colors = resolveColors(css, { ...palette, print: true })
      expect(colors['--color-bg']).toBe('#ffffff')
      expect(
        contrastRatio(colors['--color-text'], '#ffffff')
      ).toBeGreaterThanOrEqual(7)
    }
  )
})
