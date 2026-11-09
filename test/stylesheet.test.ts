import { describe, expect, it } from 'vitest'
import {
  declaredTokens,
  findRawValues,
  resolveColors
} from '../lib/stylesheet.ts'

describe('findRawValues', () => {
  it('reports a hex color with its selector and property', () => {
    expect(findRawValues('.card { color: #ff0000; }')).toEqual([
      { selector: '.card', property: 'color', value: '#ff0000' }
    ])
  })

  it('reports a color function in any property', () => {
    expect(findRawValues('.card { border-color: rgb(0, 0, 0); }')).toEqual([
      { selector: '.card', property: 'border-color', value: 'rgb(0, 0, 0)' }
    ])
  })

  it('reports a named color', () => {
    expect(findRawValues('a { background: tomato; }')).toEqual([
      { selector: 'a', property: 'background', value: 'tomato' }
    ])
  })

  it('reports a non-var font-size', () => {
    expect(findRawValues('h1 { font-size: 2rem; }')).toEqual([
      { selector: 'h1', property: 'font-size', value: '2rem' }
    ])
  })

  it('reports a raw size in the font shorthand', () => {
    const found = findRawValues('p { font: 16px/1.5 serif; }')
    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({ selector: 'p', property: 'font' })
  })

  it.each([
    'margin',
    'margin-top',
    'padding',
    'padding-inline',
    'gap',
    'row-gap',
    'column-gap'
  ])('reports a non-var %s', (property) => {
    expect(findRawValues(`.box { ${property}: 12px; }`)).toEqual([
      { selector: '.box', property, value: '12px' }
    ])
  })

  it.each([
    'width',
    'min-width',
    'max-width',
    'inline-size',
    'max-inline-size'
  ])('reports a non-var %s', (property) => {
    expect(findRawValues(`main { ${property}: 40rem; }`)).toEqual([
      { selector: 'main', property, value: '40rem' }
    ])
  })

  it('passes transparent, currentColor, inherit, 0 and var', () => {
    const css = `
      .a { background: transparent; }
      .b { border-color: currentColor; }
      .c { color: inherit; }
      .d { margin: 0; }
      .e { color: var(--color-text); font-size: var(--font-size-base); padding: var(--space-2); max-width: var(--measure); }
    `
    expect(findRawValues(css)).toEqual([])
  })

  it('does not report raw values inside a top-level :root token block', () => {
    const css =
      ':root { --color-bg: #ffffff; --space-2: 8px; color-scheme: light dark; }'
    expect(findRawValues(css)).toEqual([])
  })

  it('does not report raw values inside a data-theme token block', () => {
    const css =
      ':root[data-theme="dark"] { --color-bg: #000000; color-scheme: dark; }'
    expect(findRawValues(css)).toEqual([])
  })

  it('does not report raw values inside a token block in media print', () => {
    const css =
      '@media print { :root { --color-bg: #ffffff; --color-text: #000000; } }'
    expect(findRawValues(css)).toEqual([])
  })

  it('reports raw values in a :root rule that has non-custom-property declarations', () => {
    const css = ':root { --color-bg: #ffffff; background: #eeeeee; }'
    expect(findRawValues(css)).toEqual([
      { selector: ':root', property: 'background', value: '#eeeeee' }
    ])
  })

  it('reports a raw value in a normal rule nested in media', () => {
    const css = '@media (min-width: 40rem) { .card { color: #123456; } }'
    expect(findRawValues(css)).toEqual([
      { selector: '.card', property: 'color', value: '#123456' }
    ])
  })
})

const bg = (css: string, context: Parameters<typeof resolveColors>[1]) =>
  resolveColors(css, context)['--color-bg']

describe('resolveColors', () => {
  it('resolves a hex token', () => {
    expect(
      resolveColors(':root { --color-bg: #ffffff; }', { os: 'light' })
    ).toEqual({
      '--color-bg': '#ffffff'
    })
  })

  it('resolves a var chain', () => {
    const css =
      ':root { --color-base: #112233; --color-text: var(--color-base); }'
    expect(resolveColors(css, { os: 'light' })).toEqual({
      '--color-base': '#112233',
      '--color-text': '#112233'
    })
  })

  it('omits custom properties that are not colors', () => {
    const css = ':root { --space-2: 8px; --color-bg: #ffffff; }'
    expect(resolveColors(css, { os: 'light' })).toEqual({
      '--color-bg': '#ffffff'
    })
  })

  it('follows the os for light-dark when color-scheme is light dark', () => {
    const css =
      ':root { color-scheme: light dark; --color-bg: light-dark(#ffffff, #000000); }'
    expect(bg(css, { os: 'light' })).toBe('#ffffff')
    expect(bg(css, { os: 'dark' })).toBe('#000000')
  })

  it('uses the dark side of light-dark when color-scheme is dark regardless of os', () => {
    const css =
      ':root { color-scheme: dark; --color-bg: light-dark(#ffffff, #000000); }'
    expect(bg(css, { os: 'light' })).toBe('#000000')
  })

  it('uses the light side of light-dark when color-scheme is light regardless of os', () => {
    const css =
      ':root { color-scheme: light; --color-bg: light-dark(#ffffff, #000000); }'
    expect(bg(css, { os: 'dark' })).toBe('#ffffff')
  })

  it('applies a data-theme rule only when that theme is chosen', () => {
    const css =
      ':root { --color-bg: #ffffff; } :root[data-theme="dark"] { --color-bg: #000000; }'
    expect(bg(css, { os: 'light', theme: 'dark' })).toBe('#000000')
    expect(bg(css, { os: 'light', theme: 'light' })).toBe('#ffffff')
    expect(bg(css, { os: 'dark' })).toBe('#ffffff')
  })

  it('applies a bare data-theme rule only when some theme is chosen', () => {
    const css =
      ':root { --color-bg: #111111; } :root[data-theme] { --color-bg: #222222; }'
    expect(bg(css, { os: 'light', theme: 'light' })).toBe('#222222')
    expect(bg(css, { os: 'light' })).toBe('#111111')
  })

  it('applies a not data-theme rule unless that theme is chosen', () => {
    const css =
      ':root:not([data-theme="light"]) { --color-bg: #000000; } :root { --color-bg: #ffffff; }'
    expect(bg(css, { os: 'light' })).toBe('#000000')
    expect(bg(css, { os: 'light', theme: 'dark' })).toBe('#000000')
    expect(bg(css, { os: 'dark', theme: 'light' })).toBe('#ffffff')
  })

  it('applies a selector list when any of its selectors matches', () => {
    const css =
      ':root { --color-bg: #ffffff; } :root[data-theme="light"], :root[data-theme="dark"] { --color-bg: #123456; }'
    expect(bg(css, { os: 'light', theme: 'dark' })).toBe('#123456')
    expect(bg(css, { os: 'light', theme: 'light' })).toBe('#123456')
    expect(bg(css, { os: 'light' })).toBe('#ffffff')
  })

  it('lets higher specificity beat later source order', () => {
    const css =
      ':root[data-theme="dark"] { --color-bg: #000000; } :root { --color-bg: #ffffff; }'
    expect(bg(css, { os: 'light', theme: 'dark' })).toBe('#000000')
  })

  it('gives equal specificity to the later rule', () => {
    const css = ':root { --color-bg: #111111; } :root { --color-bg: #222222; }'
    expect(bg(css, { os: 'light' })).toBe('#222222')
  })

  it('applies media print blocks only when print is active', () => {
    const css =
      ':root { --color-bg: #101010; } @media print { :root { --color-bg: #ffffff; } }'
    expect(bg(css, { os: 'dark', print: true })).toBe('#ffffff')
    expect(bg(css, { os: 'dark', print: false })).toBe('#101010')
    expect(bg(css, { os: 'dark' })).toBe('#101010')
  })

  it('lets a data-theme rule beat media print :root by specificity', () => {
    const css = [
      ':root { --color-bg: #101010; }',
      ':root[data-theme="dark"] { --color-bg: #000000; }',
      '@media print { :root { --color-bg: #ffffff; } }'
    ].join(' ')
    expect(bg(css, { os: 'light', theme: 'dark', print: true })).toBe('#000000')
  })
})

describe('declaredTokens', () => {
  it('lists custom properties from token blocks including data-theme and print ones', () => {
    const css = [
      ':root { color-scheme: light dark; --color-bg: #ffffff; --space-2: 8px; }',
      ':root[data-theme="dark"] { --color-text: #ffffff; }',
      '@media print { :root { --color-border: #000000; } }'
    ].join(' ')
    expect([...declaredTokens(css)].sort()).toEqual([
      '--color-bg',
      '--color-border',
      '--color-text',
      '--space-2'
    ])
  })

  it('omits custom properties declared in ordinary rules', () => {
    const css = ':root { --color-bg: #ffffff; } .card { --card-pad: 4px; }'
    expect(declaredTokens(css)).toEqual(['--color-bg'])
  })
})
