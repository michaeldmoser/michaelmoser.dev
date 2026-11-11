import { createHash } from 'node:crypto'
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

  it('reports the contact address in html, xml, json and txt files however it is cased or encoded', async () => {
    const result = await checkSite(outputDir('contact-email'), options)

    expect(result.errors).toHaveLength(6)
    expect(result.errors.map((error) => error.file).sort()).toEqual([
      'data/mixed-case.json',
      'entity-decimal/index.html',
      'entity-hex/index.html',
      'entity-named/index.html',
      'feed.xml',
      'plain.txt'
    ])
  })

  it('matches only the configured contact address', async () => {
    const result = await checkSite(outputDir('contact-email'), {
      ...options,
      contactEmail: 'hello@example.test'
    })

    expect(result.errors.map((error) => error.file)).toEqual([
      'safe/index.html'
    ])
  })

  it('reports the file and line of a US phone number in any format without echoing the number', async () => {
    const result = await checkSite(outputDir('phone'), options)

    const expected: Record<string, number> = {
      'paren.txt': 3,
      'dash.txt': 2,
      'dot.txt': 4,
      'plus-one.json': 2,
      'one-dash.xml': 3,
      'bare.txt': 5,
      'tel/index.html': 10
    }
    expect(result.errors).toHaveLength(Object.keys(expected).length)
    expect(result.errors).toEqual(
      expect.arrayContaining(
        Object.entries(expected).map(([file, line]) => ({
          file,
          message: expect.stringMatching(new RegExp(`\\b${line}\\b`))
        }))
      )
    )
    for (const error of result.errors) {
      expect(error.message).not.toContain('555')
      expect(error.message).not.toContain('0123')
    }
  })

  describe('denylisted private terms', () => {
    const termsFile = fileURLToPath(
      new URL('./fixtures/private-terms.txt', import.meta.url)
    )
    const hash = (term: string) =>
      createHash('sha256').update(term.toLowerCase()).digest('hex').slice(0, 12)
    const expectReported = (
      result: Awaited<ReturnType<typeof checkSite>>,
      expected: Record<string, string>,
      terms: string[]
    ) => {
      expect(result.errors).toHaveLength(Object.keys(expected).length)
      expect(result.errors).toEqual(
        expect.arrayContaining(
          Object.entries(expected).map(([file, term]) => ({
            file,
            message: expect.stringContaining(hash(term))
          }))
        )
      )
      const output = [
        ...result.errors.map((error) => error.message),
        ...result.warnings
      ]
        .join('\n')
        .toLowerCase()
      for (const term of terms) {
        expect(output).not.toContain(term)
      }
    }

    it('reports a hash and file for terms from PRIVATE_TERMS in any letter case without echoing them', async () => {
      const result = await checkSite(outputDir('private-terms'), {
        ...options,
        env: { PRIVATE_TERMS: ' ZzQuillFern |  | zzbrackenmoor ' }
      })

      expectReported(
        result,
        { 'index.html': 'zzbrackenmoor', 'notes.txt': 'zzquillfern' },
        ['zzquillfern', 'zzbrackenmoor']
      )
    })

    it('reports a hash and file for terms from the private terms file when PRIVATE_TERMS is unset', async () => {
      const result = await checkSite(outputDir('private-terms'), {
        ...options,
        privateTermsPath: termsFile
      })

      expectReported(
        result,
        { 'file-only.json': 'zzthornwick', 'feed.xml': 'zzlindenmere' },
        ['zzthornwick', 'zzlindenmere']
      )
    })

    it('uses only PRIVATE_TERMS when it is non-blank even though the private terms file exists', async () => {
      const result = await checkSite(outputDir('private-terms'), {
        ...options,
        env: { PRIVATE_TERMS: 'zzquillfern' },
        privateTermsPath: termsFile
      })

      expectReported(result, { 'notes.txt': 'zzquillfern' }, [
        'zzquillfern',
        'zzthornwick',
        'zzlindenmere'
      ])
    })
  })

  describe('missing denylist in CI', () => {
    it.each([
      ['CI is set and PRIVATE_TERMS is unset', { CI: '1' }],
      [
        'WORKERS_CI is set and PRIVATE_TERMS is empty',
        { WORKERS_CI: '1', PRIVATE_TERMS: '' }
      ],
      [
        'WORKERS_CI is set and PRIVATE_TERMS is whitespace',
        { WORKERS_CI: '1', PRIVATE_TERMS: '   ' }
      ]
    ])(
      'reports an error that the denylist is missing when %s and there is no file',
      async (_name, env) => {
        const result = await checkSite(outputDir('clean'), { ...options, env })

        expect(result.errors).toHaveLength(1)
        expect(result.errors[0].message).toMatch(/denylist/i)
        expect(result.errors[0].message).toMatch(/missing/i)
      }
    )
  })

  describe('missing denylist locally', () => {
    const blankTermsFile = fileURLToPath(
      new URL('./fixtures/private-terms-blank.txt', import.meta.url)
    )

    it.each([
      [
        'PRIVATE_TERMS is whitespace and there is no file',
        { env: { PRIVATE_TERMS: '   ' } }
      ],
      [
        'PRIVATE_TERMS is unset and the file holds only separators',
        { privateTermsPath: blankTermsFile }
      ]
    ])(
      'warns about the denylist and still runs the other checks when %s',
      async (_name, overrides) => {
        const result = await checkSite(outputDir('contact-email'), {
          ...options,
          ...overrides
        })

        expect(result.warnings).toHaveLength(1)
        expect(result.warnings[0]).toMatch(/denylist/i)
        expect(result.errors.map((error) => error.file).sort()).toEqual([
          'data/mixed-case.json',
          'entity-decimal/index.html',
          'entity-hex/index.html',
          'entity-named/index.html',
          'feed.xml',
          'plain.txt'
        ])
        for (const error of result.errors) {
          expect(error.message).not.toMatch(/denylist/i)
        }
      }
    )
  })
})
