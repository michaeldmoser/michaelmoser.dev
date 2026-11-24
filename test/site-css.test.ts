import { describe, expect, it } from 'vitest'
import { contrastRatio } from '../lib/contrast.ts'
import {
  declaredTokens,
  findRawValues,
  resolveColors
} from '../lib/stylesheet.ts'
import { compileSiteCss } from '../src/_includes/site-css.ts'

const css = await compileSiteCss()

describe('site css tokens', () => {
  it('has no raw color, size, or measure values outside the token blocks', () => {
    expect(findRawValues(css)).toEqual([])
  })

  it('declares the required color tokens', () => {
    expect(declaredTokens(css)).toEqual(
      expect.arrayContaining([
        '--color-text',
        '--color-surface',
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
    expect(light['--color-surface']).toBeDefined()
    expect(dark['--color-surface']).toBeDefined()
    expect(light['--color-surface']).not.toBe(dark['--color-surface'])
  })

  const lightValues = {
    '--color-text': '#1a1a1a',
    '--color-surface': '#ffffff',
    '--color-link': '#0b57d0',
    '--color-accent': '#8a4b00',
    '--color-focus': '#0a3d91',
    '--color-border': '#767676'
  }
  const darkValues = {
    '--color-text': '#e8e8e8',
    '--color-surface': '#121212',
    '--color-link': '#8ab4f8',
    '--color-accent': '#f0b45c',
    '--color-focus': '#b3d0ff',
    '--color-border': '#8c8c8c'
  }

  it.each([
    ['light OS', { os: 'light' }, lightValues],
    ['dark OS', { os: 'dark' }, darkValues],
    ['chosen light theme', { os: 'dark', theme: 'light' }, lightValues],
    ['chosen dark theme', { os: 'light', theme: 'dark' }, darkValues]
  ] as const)('holds the exact semantic token values for %s', (_l, palette, values) => {
    expect(resolveColors(css, palette)).toMatchObject(values)
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
        contrastRatio(colors['--color-text'], colors['--color-surface'])
      ).toBeGreaterThanOrEqual(4.5)
      expect(
        contrastRatio(colors['--color-link'], colors['--color-surface'])
      ).toBeGreaterThanOrEqual(4.5)
    }
  )

  it.each(printPalettes)(
    'print uses a white background with high contrast text for %s',
    (_label, palette) => {
      const colors = resolveColors(css, { ...palette, print: true })
      expect(colors['--color-surface']).toBe('#ffffff')
      expect(
        contrastRatio(colors['--color-text'], '#ffffff')
      ).toBeGreaterThanOrEqual(7)
    }
  )
})
