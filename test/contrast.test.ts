import { describe, expect, it } from 'vitest'
import { contrastRatio } from '../lib/contrast.ts'

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
