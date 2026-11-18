import { describe, expect, it } from 'vitest'
import {
  decodeAddress,
  encodeAddress,
  readableAddress
} from '../lib/contact.ts'

describe('contact address encoding', () => {
  it.each(['reachoutto@michaelmoser.dev', 'Someone.Else+tag@example.co.uk'])(
    'decoding the encoded form returns the address and hides it %s',
    (address) => {
      const encoded = encodeAddress(address)

      expect(decodeAddress(encoded)).toBe(address)
      expect(encoded.toLowerCase()).not.toContain(address.toLowerCase())
    }
  )
})

describe('contact address readable form', () => {
  it('spells out the at sign and the domain dot', () => {
    expect(readableAddress('reachoutto@michaelmoser.dev')).toBe(
      'reachoutto [at] michaelmoser [dot] dev'
    )
  })

  it('spells out every dot in a multi label domain', () => {
    expect(readableAddress('someone@mail.example.co.uk')).toBe(
      'someone [at] mail [dot] example [dot] co [dot] uk'
    )
  })

  it('leaves dots in the local part untouched', () => {
    expect(readableAddress('first.last@example.com')).toBe(
      'first.last [at] example [dot] com'
    )
  })
})
