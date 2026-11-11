import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { checkSite } from '../lib/site-check.ts'

const outputDir = (name: string) =>
  fileURLToPath(new URL(`./fixtures/output/${name}`, import.meta.url))

const options = {
  env: {},
  privateTermsPath: fileURLToPath(
    new URL('./fixtures/no-such-private-terms.txt', import.meta.url)
  ),
  contactEmail: 'reachoutto@michaelmoser.dev'
}

describe('checkSite', () => {
  it('reports no errors and only the denylist warning for a clean built site', async () => {
    const result = await checkSite(outputDir('clean'), options)

    expect(result.errors).toEqual([])
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toMatch(/denylist/i)
  })

  it('reports each missing internal link target against the page that links to it', async () => {
    const result = await checkSite(outputDir('broken-links'), options)

    expect(result.errors).toHaveLength(3)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          file: 'index.html',
          message: expect.stringContaining('/missing-root/')
        },
        {
          file: 'index.html',
          message: expect.stringContaining('missing-absolute')
        },
        {
          file: 'posts/hello/index.html',
          message: expect.stringContaining('../gone/')
        }
      ])
    )
  })

  it('reports each missing image, stylesheet, script and media asset against the page that references it', async () => {
    const result = await checkSite(outputDir('broken-assets'), options)

    expect(result.errors).toHaveLength(6)
    expect(result.errors).toEqual(
      expect.arrayContaining(
        [
          '/images/missing.svg',
          '/images/missing-2x.svg',
          '/images/missing-wide.svg',
          '/media/missing.mp4',
          '/css/missing.css',
          '/js/missing.js'
        ].map((path) => ({
          file: 'index.html',
          message: expect.stringContaining(path)
        }))
      )
    )
  })

  it('reports the html-validate rule, message and line for a page with invalid HTML', async () => {
    const result = await checkSite(outputDir('invalid-html'), options)

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].file).toBe('bad/index.html')
    expect(result.errors[0].message).toContain('no-dup-id')
    expect(result.errors[0].message).toContain('Duplicate ID "intro"')
    expect(result.errors[0].message).toMatch(/\b11\b/)
  })
})
