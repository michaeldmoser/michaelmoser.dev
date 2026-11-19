import { describe, expect, it } from 'vitest'
import { redirectToApex } from '../lib/www-redirect.ts'

describe('www redirect', () => {
  it('sends a www request to the apex with a 301 keeping path and query', () => {
    const request = new Request('https://www.michaelmoser.dev/some/path?x=1', {
      method: 'GET'
    })

    const response = redirectToApex(request, 'https://michaelmoser.dev')

    expect(response.status).toBe(301)
    expect(response.headers.get('Location')).toBe(
      'https://michaelmoser.dev/some/path?x=1'
    )
  })

  it.each([
    ['https://www.michaelmoser.dev/', 'https://michaelmoser.dev/'],
    ['https://www.michaelmoser.dev/about/', 'https://michaelmoser.dev/about/']
  ])('adds no trailing question mark when %s has no query', (url, expected) => {
    const response = redirectToApex(
      new Request(url, { method: 'GET' }),
      'https://michaelmoser.dev'
    )

    expect(response.headers.get('Location')).toBe(expected)
  })

  it('carries a percent-encoded path and query through unchanged', () => {
    const request = new Request(
      'https://www.michaelmoser.dev/caf%C3%A9/?q=a%20b',
      { method: 'GET' }
    )

    const response = redirectToApex(request, 'https://michaelmoser.dev')

    expect(response.headers.get('Location')).toBe(
      'https://michaelmoser.dev/caf%C3%A9/?q=a%20b'
    )
  })

  it.each(['GET', 'HEAD', 'POST'])(
    'redirects an http %s request to the https apex with a 301',
    (method) => {
      const request = new Request('http://www.michaelmoser.dev/some/path?x=1', {
        method
      })

      const response = redirectToApex(request, 'https://michaelmoser.dev')

      expect(response.status).toBe(301)
      expect(response.headers.get('Location')).toBe(
        'https://michaelmoser.dev/some/path?x=1'
      )
    }
  )
})
