import postcss from 'postcss'
import { describe, expect, it } from 'vitest'
import { contrastRatio } from '../lib/contrast.ts'
import {
  declaredTokens,
  findRawValues,
  resolveColors
} from '../lib/stylesheet.ts'
import { compileSiteCss } from '../src/_includes/site-css.ts'

const css = await compileSiteCss()

const rawValuePattern =
  /#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|hwb)\(|(?:^|[\s(,])-?\d*\.?\d+(?:px|rem|em|ch|vw|vh|ex|pt)\b/i

function insideAtRule(node: postcss.Node, name: string) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (parent.type === 'atrule' && (parent as postcss.AtRule).name === name) {
      return true
    }
  }
  return false
}

function insideLayer(node: postcss.Node, layer: string) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (
      parent.type === 'atrule' &&
      (parent as postcss.AtRule).name === 'layer' &&
      (parent as postcss.AtRule).params.trim() === layer
    ) {
      return true
    }
  }
  return false
}

describe('site css tokens', () => {
  it('has no raw color, size, or measure values outside the token blocks', () => {
    expect(findRawValues(css)).toEqual([])
  })

  it('declares custom property tokens only inside the tokens layer', () => {
    const outside: string[] = []
    postcss.parse(css).walkDecls((decl) => {
      if (!decl.prop.startsWith('--') || decl.prop.startsWith('--tw-')) return
      if (insideAtRule(decl, 'property')) return
      if (!insideLayer(decl, 'tokens')) outside.push(decl.prop)
    })
    expect(outside).toEqual([])
  })

  it('writes raw color, size and measure values only inside the tokens layer', () => {
    const outside: string[] = []
    postcss.parse(css).walkDecls((decl) => {
      if (decl.prop.startsWith('--')) return
      if (insideAtRule(decl, 'property')) return
      if (insideLayer(decl, 'tokens')) return
      if (rawValuePattern.test(decl.value)) {
        outside.push(`${decl.prop}: ${decl.value}`)
      }
    })
    expect(outside).toEqual([])
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
  ] as const)(
    'holds the exact semantic token values for %s',
    (_l, palette, values) => {
      expect(resolveColors(css, palette)).toMatchObject(values)
    }
  )
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

const tokenKinds = [
  'keyword',
  'string',
  'comment',
  'number',
  'function',
  'punctuation'
]

function resolveVar(value: string, colors: Record<string, string>) {
  const match = /^var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)$/.exec(value.trim())
  if (match) return colors[match[1]]
  return value.trim()
}

function declaredValues(
  selectorTest: (selector: string) => boolean,
  props: string[]
) {
  const values: string[] = []
  postcss.parse(css).walkRules((rule) => {
    if (!rule.selectors.some(selectorTest)) return
    rule.walkDecls((decl) => {
      if (props.includes(decl.prop)) values.push(decl.value)
    })
  })
  return values
}

describe('site css code highlighting contrast', () => {
  it.each(screenPalettes)(
    'every Prism token color meets AA contrast against the code block background for %s',
    (_label, palette) => {
      const colors = resolveColors(css, palette)
      const backgrounds = declaredValues(
        (selector) =>
          /(^|[\s>+~])pre\b/.test(selector) && !/\.token/.test(selector),
        ['background', 'background-color']
      )
      expect(backgrounds.length).toBeGreaterThan(0)
      const background = resolveVar(backgrounds[backgrounds.length - 1], colors)
      expect(background).toMatch(/^#[0-9a-f]{6}$/i)

      for (const kind of tokenKinds) {
        const pattern = new RegExp(`\\.token\\.${kind}(?![\\w-])`)
        const values = declaredValues(
          (selector) => pattern.test(selector),
          ['color']
        )
        expect(values.length, `${kind} has a color rule`).toBeGreaterThan(0)
        for (const value of values) {
          const color = resolveVar(value, colors)
          expect(color, `${kind} color resolves`).toMatch(/^#[0-9a-f]{6}$/i)
          expect(
            contrastRatio(color, background),
            `${kind} against code background`
          ).toBeGreaterThanOrEqual(4.5)
        }
      }
    }
  )
})

describe('site css code block overflow', () => {
  it('scrolls post pre blocks horizontally instead of widening the page', () => {
    const values = declaredValues(
      (selector) => /\.prose/.test(selector) && /\bpre$/.test(selector.trim()),
      ['overflow-x']
    )
    expect(values.length).toBeGreaterThan(0)
    expect(values[values.length - 1].trim()).toBe('auto')
  })
})

type DiagramFilterRule = {
  selector: string
  filter: string
  darkMedia: boolean
}

function normalizeSelector(selector: string) {
  return selector.replace(/["']/g, '').replace(/\s+/g, ' ').trim()
}

function resolveFilter(value: string) {
  const match = /^var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)$/.exec(value.trim())
  if (!match) return value.trim()
  let resolved = ''
  postcss.parse(css).walkDecls(match[1], (decl) => {
    resolved = decl.value
  })
  return resolved
}

function inverseFilterRules() {
  const found: DiagramFilterRule[] = []
  postcss.parse(css).walkRules((rule) => {
    rule.walkDecls('filter', (decl) => {
      if (decl.parent !== rule) return
      const filter = resolveFilter(decl.value)
      if (!/invert\(/.test(filter)) return
      let darkMedia = false
      let parent: postcss.Node | undefined = rule.parent
      for (; parent; parent = parent.parent) {
        if (
          parent.type === 'atrule' &&
          (parent as postcss.AtRule).name === 'media' &&
          /prefers-color-scheme:\s*dark/.test((parent as postcss.AtRule).params)
        ) {
          darkMedia = true
        }
      }
      for (const selector of rule.selectors) {
        found.push({ selector: normalizeSelector(selector), filter, darkMedia })
      }
    })
  })
  return found
}

const diagramTarget = '.diagram:not(.no-invert)'
const chosenDark = ':root[data-theme=dark]'
const osDark = ':root:not([data-theme=light])'

describe('site css diagram dark mode filter', () => {
  it('inverts and hue-rotates diagrams when the chosen theme is dark', () => {
    const rules = inverseFilterRules().filter(
      (rule) =>
        rule.selector.includes(chosenDark) &&
        rule.selector.endsWith(diagramTarget)
    )
    expect(rules.length).toBeGreaterThan(0)
    for (const rule of rules) {
      expect(rule.filter).toMatch(/invert\(/)
      expect(rule.filter).toMatch(/hue-rotate\(/)
    }
  })

  it('inverts and hue-rotates diagrams when the OS is dark and no theme is chosen', () => {
    const rules = inverseFilterRules().filter(
      (rule) =>
        rule.darkMedia &&
        rule.selector.includes(osDark) &&
        rule.selector.endsWith(diagramTarget)
    )
    expect(rules.length).toBeGreaterThan(0)
    for (const rule of rules) {
      expect(rule.filter).toMatch(/invert\(/)
      expect(rule.filter).toMatch(/hue-rotate\(/)
    }
  })

  it('applies the filter only to non-opt-out diagrams in dark contexts', () => {
    const rules = inverseFilterRules()
    expect(rules.length).toBeGreaterThan(0)
    for (const rule of rules) {
      expect(rule.selector, 'targets only diagrams').toMatch(
        /\.diagram:not\(\.no-invert\)$/
      )
      const dark =
        rule.selector.includes(chosenDark) ||
        (rule.darkMedia && rule.selector.includes(osDark))
      expect(dark, `${rule.selector} is a dark context`).toBe(true)
    }
  })
})

const calloutBase = /\.callout(?![\w-])/
const calloutTypes = ['note', 'tip', 'warning', 'tradeoff']
const calloutSurfaceProps = [
  'background',
  'background-color',
  'border',
  'border-left',
  'border-inline-start',
  'border-color',
  'border-left-color',
  'border-inline-start-color'
]
const calloutBackgroundProps = ['background', 'background-color']

describe('site css callouts', () => {
  it('sets callouts apart from body text with a border or background from color tokens', () => {
    const tokens = declaredTokens(css)
    const values = declaredValues(
      (selector) => calloutBase.test(selector),
      calloutSurfaceProps
    )
    const referenced = values.flatMap((value) =>
      [...value.matchAll(/var\(\s*(--[\w-]+)/g)].map((match) => match[1])
    )
    expect(
      referenced.filter(
        (name) => name.startsWith('--color-') && tokens.includes(name)
      ).length
    ).toBeGreaterThan(0)
  })

  it.each(screenPalettes)(
    'callout label text meets AA contrast against the callout background for %s',
    (_label, palette) => {
      const colors = resolveColors(css, palette)
      const declared = declaredValues(
        (selector) =>
          calloutBase.test(selector) ||
          calloutTypes.some((type) =>
            new RegExp(`\\.callout-${type}(?![\\w-])`).test(selector)
          ),
        calloutBackgroundProps
      )
      const backgrounds =
        declared.length > 0
          ? declared.map((value) => resolveVar(value, colors))
          : [colors['--color-surface']]
      const labelColors = declaredValues(
        (selector) => /\.callout-label(?![\w-])/.test(selector),
        ['color']
      )
      expect(labelColors.length, 'label has a color rule').toBeGreaterThan(0)

      for (const background of backgrounds) {
        expect(background).toMatch(/^#[0-9a-f]{6}$/i)
        for (const value of labelColors) {
          const color = resolveVar(value, colors)
          expect(color, 'label color resolves').toMatch(/^#[0-9a-f]{6}$/i)
          expect(
            contrastRatio(color, background),
            `label ${color} against ${background}`
          ).toBeGreaterThanOrEqual(4.5)
        }
      }
    }
  )
})

describe('site css code block wrapper', () => {
  const wrapperSelector = /\.code-block(?![\w-])/

  it('styles the copy button wrapper as a stylesheet component', () => {
    let declarations = 0
    postcss.parse(css).walkRules((rule) => {
      if (!rule.selectors.some((selector) => wrapperSelector.test(selector))) {
        return
      }
      rule.walkDecls(() => {
        declarations += 1
      })
    })
    expect(declarations).toBeGreaterThan(0)
  })

  it('keeps the wrapper itself from scrolling horizontally', () => {
    const overflows = declaredValues(
      (selector) =>
        wrapperSelector.test(selector) && !/\b(pre|button)\b/.test(selector),
      ['overflow', 'overflow-x']
    )
    for (const value of overflows) {
      expect(value.trim()).not.toMatch(/\b(auto|scroll)\b/)
    }
  })
})

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
