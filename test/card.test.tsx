import { describe, expect, it } from 'vitest'
import { cardPalette, toSatoriNode } from '../lib/card.ts'
import { resolveColors } from '../lib/stylesheet.ts'
import { compileSiteCss } from '../src/_includes/site-css.ts'

const css = await compileSiteCss()

describe('cardPalette', () => {
  const dark = { os: 'dark', theme: 'dark' } as const

  it('uses the dark surface as background, dark text as text and the dark semantic accent as accent from site.css', () => {
    const colors = resolveColors(css, dark)

    expect(cardPalette(css)).toEqual({
      background: colors['--color-surface'],
      text: colors['--color-text'],
      accent: colors['--color-accent']
    })
  })

  it('follows the semantic accent token when its dark value changes', () => {
    const changed = css.replace(
      /(--color-accent:\s*light-dark\(\s*[^,]+,\s*)(?:var\([^)]*\)|[^)]+)(\s*\))/,
      '$1#123456$2'
    )

    expect(changed).not.toBe(css)
    expect(cardPalette(changed).accent).toBe('#123456')
  })
})

describe('toSatoriNode', () => {
  it('converts a string child to a satori node with style and children', () => {
    const node = toSatoriNode(<div style='display: flex'>Hello</div>)

    expect(node).toEqual({
      type: 'div',
      props: { style: { display: 'flex' }, children: 'Hello' }
    })
  })

  it('converts an array of children and nested elements recursively', () => {
    const node = toSatoriNode(
      <div style='display: flex'>
        <span style='color: red'>One</span>
        <span>Two</span>
      </div>
    )

    expect(node).toEqual({
      type: 'div',
      props: {
        style: { display: 'flex' },
        children: [
          { type: 'span', props: { style: { color: 'red' }, children: 'One' } },
          { type: 'span', props: { children: 'Two' } }
        ]
      }
    })
  })

  it('invokes function components with their props', () => {
    const Badge = ({ label }: { label: string }) => (
      <span style='color: blue'>{label}</span>
    )

    const node = toSatoriNode(
      <div>
        <Badge label='Montana' />
        <b>x</b>
      </div>
    )

    expect(node).toEqual({
      type: 'div',
      props: {
        children: [
          {
            type: 'span',
            props: { style: { color: 'blue' }, children: 'Montana' }
          },
          { type: 'b', props: { children: 'x' } }
        ]
      }
    })
  })

  it('converts a CSS style string to a camelCased style object', () => {
    const node = toSatoriNode(
      <div style='display: flex; font-size: 72px; line-height: 1.15; background-color: #121212'>
        Hi
      </div>
    )

    expect(node).toEqual({
      type: 'div',
      props: {
        style: {
          display: 'flex',
          fontSize: '72px',
          lineHeight: '1.15',
          backgroundColor: '#121212'
        },
        children: 'Hi'
      }
    })
  })

  it('ignores empty declarations and surrounding whitespace in a style string', () => {
    const node = toSatoriNode(
      <div style='  display: flex ;; color : red ;  '>Hi</div>
    )

    expect(node).toEqual({
      type: 'div',
      props: { style: { display: 'flex', color: 'red' }, children: 'Hi' }
    })
  })

  it('keeps a style value containing a colon whole', () => {
    const node = toSatoriNode(
      <div style='background-image: url(https://example.com/a.png)'>Hi</div>
    )

    expect(node).toEqual({
      type: 'div',
      props: {
        style: { backgroundImage: 'url(https://example.com/a.png)' },
        children: 'Hi'
      }
    })
  })

  it('drops null and false children', () => {
    const node = toSatoriNode(
      <div>
        {null}
        <i>kept</i>
        {false}
        <b>also</b>
      </div>
    )

    expect(node).toEqual({
      type: 'div',
      props: {
        children: [
          { type: 'i', props: { children: 'kept' } },
          { type: 'b', props: { children: 'also' } }
        ]
      }
    })
  })
})
