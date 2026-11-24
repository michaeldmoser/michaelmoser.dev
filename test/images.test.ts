import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
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

describe('raster images', () => {
  let outputDir = ''
  let html = ''

  beforeAll(async () => {
    const outcome = await buildScenario('images', { write: true })
    outputDir = outcome.outputDir ?? ''
    const page = join(outputDir, 'writing', 'gallery', 'index.html')
    html = existsSync(page) ? readFileSync(page, 'utf8') : ''
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
