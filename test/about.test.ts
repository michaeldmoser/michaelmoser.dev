import { join } from 'node:path'
import { register } from 'tsx/esm/api'
import { beforeAll, describe, expect, it } from 'vitest'

interface BuildResult {
  url: string
  content: string
}

let results: BuildResult[]

beforeAll(async () => {
  register({
    tsconfig: join(import.meta.dirname, 'scenarios.tsconfig.json')
  })
  const { default: Eleventy } = await import('@11ty/eleventy')
  results = await new Eleventy('src', '_site', {
    configPath: 'eleventy.config.ts'
  }).toJSON()
}, 60_000)

function section(html: string, tag: string) {
  return html.match(new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`))?.[0] ?? ''
}

function hrefs(fragment: string) {
  return [...fragment.matchAll(/<a\s[^>]*>/g)].map(
    (match) => match[0].match(/href="([^"]*)"/)?.[1]
  )
}

describe('about page', () => {
  it('shows the Uplisting story in the shared shell with no contact email', () => {
    const page = results.find((result) => result.url === '/about/')

    expect(page).toBeDefined()
    const html = page?.content ?? ''

    expect(section(html, 'head')).toMatch(
      /<link\s+rel="stylesheet"\s+href="\/assets\/css\/site\.css"\s*\/?>/
    )
    expect(hrefs(section(html, 'header'))).toContain('/')
    expect(section(html, 'nav')).not.toBe('')
    expect(html).toMatch(/<button\b[^>]*\bid="theme-toggle"[^>]*>/)
    expect(hrefs(section(html, 'footer'))).toContain(
      'https://github.com/michaeldmoser'
    )

    const main = html.match(/<main[\s>]([\s\S]*)<\/main>/)?.[1] ?? ''
    expect(main).not.toBe('')
    expect(main).not.toMatch(/\sdata-contact\b/)
    expect(main.replace(/<[^>]*>/g, ' ')).toContain('Uplisting')
  })
})
