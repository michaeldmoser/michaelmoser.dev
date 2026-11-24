import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { XMLParser } from 'fast-xml-parser'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildScenario } from './scenario.ts'

function failureText(error: Error | undefined) {
  const parts: string[] = []
  let current: unknown = error
  while (current instanceof Error) {
    parts.push(current.message)
    current =
      (current as Error & { originalError?: unknown }).originalError ??
      current.cause
  }
  return parts.join('\n')
}

describe('image alt text failures', () => {
  it.each([
    ['image-missing-alt', 'shot-post/index.md', 'shot.png'],
    ['image-whitespace-alt', 'blank-post/index.md', 'shot.png'],
    ['image-svg-missing-alt', 'diagram-post/index.md', 'flow.svg'],
    [
      'image-remote-missing-alt',
      'remote-post/index.md',
      'https://example.com/pictures/remote.png'
    ]
  ])(
    'fails the build naming the post and the src when %s has no alt text',
    async (scenario, post, src) => {
      const outcome = await buildScenario(scenario)

      expect(outcome.error).toBeDefined()
      const text = failureText(outcome.error)
      expect(text).toContain(post)
      expect(text).toContain(`image "${src}" has no alt text`)
    },
    60_000
  )
})

let galleryBuild: Promise<{ outputDir: string; html: string }> | undefined

function buildGallery() {
  galleryBuild ??= buildScenario('images', { write: true }).then((outcome) => {
    const outputDir = outcome.outputDir ?? ''
    const page = join(outputDir, 'writing', 'gallery', 'index.html')
    return {
      outputDir,
      html: existsSync(page) ? readFileSync(page, 'utf8') : ''
    }
  })
  return galleryBuild
}

describe('raster images', () => {
  let outputDir = ''
  let html = ''

  beforeAll(async () => {
    ;({ outputDir, html } = await buildGallery())
  }, 60_000)

  function picture() {
    return html.match(/<picture>[\s\S]*?<\/picture>/)?.[0] ?? ''
  }

  function referencedFiles() {
    const urls = [...picture().matchAll(/srcset="([^"]+)"/g)].flatMap((match) =>
      match[1].split(',').map((candidate) => candidate.trim().split(/\s+/)[0])
    )
    return urls
  }

  it('offers AVIF and WebP sources for a local screenshot', () => {
    expect(picture()).toMatch(/<source[^>]*type="image\/avif"/)
    expect(picture()).toMatch(/<source[^>]*type="image\/webp"/)
  })

  it('renders a lazy img with dimensions and the alt text', () => {
    const img = picture().match(/<img[^>]*>/)?.[0] ?? ''

    expect(img).toMatch(/\swidth="\d+"/)
    expect(img).toMatch(/\sheight="\d+"/)
    expect(img).toContain('loading="lazy"')
    expect(img).toContain('alt="A terminal screenshot"')
  })

  it('writes every referenced variant to the output', () => {
    const urls = referencedFiles()

    expect(urls.length).toBeGreaterThan(0)
    for (const url of urls) {
      expect(existsSync(join(outputDir, url))).toBe(true)
    }
  })

  it('leaves a remote image as a plain img', () => {
    expect(html).toMatch(/<img[^>]*src="https:\/\/example\.com\/remote\.png"/)
    expect(picture()).not.toContain('example.com')
  })
})

describe('svg diagrams', () => {
  const sourceDir = join(import.meta.dirname, 'fixtures', 'images', 'gallery')
  let outputDir = ''
  let html = ''

  beforeAll(async () => {
    ;({ outputDir, html } = await buildGallery())
  }, 60_000)

  function imgFor(name: string) {
    const tags = html.match(/<img[^>]*>/g) ?? []
    return tags.find((tag) => tag.includes(`src="${name}"`)) ?? ''
  }

  function classesOf(tag: string) {
    return (tag.match(/\sclass="([^"]*)"/)?.[1] ?? '').split(/\s+/)
  }

  it.each(['flow.svg', 'chart.no-invert.svg'])(
    'copies %s to the output byte-identical and references it by name',
    (name) => {
      const copied = join(outputDir, 'writing', 'gallery', name)

      const identical =
        existsSync(copied) &&
        readFileSync(copied).equals(readFileSync(join(sourceDir, name)))

      expect(existsSync(copied)).toBe(true)
      expect(identical).toBe(true)
      expect(imgFor(name)).not.toBe('')
      expect(html).not.toMatch(/<picture>[\s\S]*?\.svg[\s\S]*?<\/picture>/)
    }
  )

  it('marks a diagram with the diagram class only', () => {
    expect(classesOf(imgFor('flow.svg'))).toEqual(['diagram'])
  })

  it('marks a no-invert diagram with diagram and no-invert', () => {
    expect(classesOf(imgFor('chart.no-invert.svg')).sort()).toEqual([
      'diagram',
      'no-invert'
    ])
  })
})

describe('feed and share images', () => {
  const sourceDir = join(import.meta.dirname, 'fixtures', 'images', 'gallery')
  const origin = 'https://michaelmoser.dev'
  let outputDir = ''

  beforeAll(async () => {
    ;({ outputDir } = await buildGallery())
  }, 60_000)

  function sourcePng(name: string) {
    return Buffer.from(
      readFileSync(join(sourceDir, `${name}.base64`), 'utf8'),
      'base64'
    )
  }

  function feedContent() {
    const feed = new XMLParser({
      ignoreAttributes: false,
      parseTagValue: false,
      trimValues: false
    }).parse(readFileSync(join(outputDir, 'feed.xml'), 'utf8')).feed
    const entries: { content: { '#text': string } }[] = [feed.entry].flat()
    return entries.map((entry) => entry.content['#text']).join('\n')
  }

  it('points the feed image at an original file present in the output', () => {
    const urls = [
      ...feedContent().matchAll(
        /https:\/\/michaelmoser\.dev(\/writing\/gallery\/[^"'\s<>]+\.png)/g
      )
    ].map((match) => match[1])

    expect(urls).toContain('/writing/gallery/shot.png')
    const served = join(outputDir, '/writing/gallery/shot.png')
    expect(existsSync(served)).toBe(true)
    expect(readFileSync(served).equals(sourcePng('shot.png'))).toBe(true)
  })

  it('still serves a post ogImage at its post path', () => {
    const served = join(outputDir, 'writing', 'gallery', 'og-card.png')

    expect(existsSync(served)).toBe(true)
    expect(readFileSync(served).equals(sourcePng('og-card.png'))).toBe(true)
    const page = readFileSync(
      join(outputDir, 'writing', 'gallery', 'index.html'),
      'utf8'
    )
    expect(page).toContain(`content="${origin}/writing/gallery/og-card.png"`)
  })
})
