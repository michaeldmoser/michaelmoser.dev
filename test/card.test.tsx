import { describe, expect, it } from 'vitest'
import { toSatoriNode } from '../lib/card.ts'

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
          { type: 'span', props: { style: { color: 'blue' }, children: 'Montana' } },
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
