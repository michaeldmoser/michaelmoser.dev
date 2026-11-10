import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { cardPalette, toSatoriNode } from '../lib/card.ts'

const css = readFileSync(
  new URL('../src/assets/css/site.css', import.meta.url),
  'utf8'
)

describe('cardPalette', () => {
  it('uses the dark paper as background, dark ink as text and dark amber as accent from site.css', () => {
    expect(cardPalette(css)).toEqual({
      background: '#121212',
      text: '#e8e8e8',
      accent: '#f0b45c'
    })
  })

  it('follows site.css when the dark amber changes', () => {
    const changed = css.replace(
      '--palette-dark-amber: #f0b45c;',
      '--palette-dark-amber: #123456;'
    )

    expect(cardPalette(changed).accent).toBe('#123456')
  })
})

describe('toSatoriNode', () => {
  it('converts a string child to a satori node with style and children', () => {
    const node = toSatoriNode(<div style={{ display: 'flex' }}>Hello</div>)

    expect(node).toEqual({
      type: 'div',
      props: { style: { display: 'flex' }, children: 'Hello' }
    })
  })

  it('converts an array of children and nested elements recursively', () => {
    const node = toSatoriNode(
      <div style={{ display: 'flex' }}>
        <span style={{ color: 'red' }}>One</span>
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
      <span style={{ color: 'blue' }}>{label}</span>
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
