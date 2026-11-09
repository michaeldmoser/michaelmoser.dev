import { readFileSync } from 'node:fs'
import postcss from 'postcss'
import { register } from 'tsx/esm/api'
import { beforeAll, describe, expect, it } from 'vitest'

interface BuildResult {
  url: string
  inputPath: string
  outputPath: string
  content: string
}

let results: BuildResult[]

beforeAll(async () => {
  register()
  const { default: Eleventy } = await import('@11ty/eleventy')
  results = await new Eleventy('src', '_site', {
    configPath: 'eleventy.config.ts'
  }).toJSON()
}, 60_000)

describe('site build', () => {
  it('renders the index page as a full HTML document with the markdown body as unescaped HTML inside main', () => {
    const index = results.find((result) => result.url === '/')

    expect(index).toBeDefined()
    const html = index?.content ?? ''
    expect(html.toLowerCase()).toContain('<!doctype html>')
    const main = html.match(/<main>([\s\S]*)<\/main>/)
    expect(main).not.toBeNull()
    expect(main?.[1]).toContain('<h1')
    expect(main?.[1]).not.toContain('&lt;h1')
  })

  it('keeps a literal {{ page.url }} in the markdown verbatim instead of rendering it', () => {
    const index = results.find((result) => result.url === '/')

    expect(index).toBeDefined()
    expect(index?.content).toContain('<code>{{ page.url }}</code>')
  })
})

function anchors(fragment: string) {
  return [...fragment.matchAll(/<a\s[^>]*>[\s\S]*?<\/a>/g)].map((match) => ({
    href: match[0].match(/href="([^"]*)"/)?.[1],
    text: match[0].replace(/<[^>]*>/g, '').trim()
  }))
}

function section(html: string, tag: string) {
  return html.match(new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`))?.[0] ?? ''
}

describe('base layout shell', () => {
  it('renders the same header, nav, theme toggle, footer and head links on every built html page', () => {
    const pages = results.filter((result) =>
      result.outputPath.endsWith('.html')
    )
    expect(pages.length).toBeGreaterThan(0)

    for (const page of pages) {
      const html = page.content
      const head = section(html, 'head')

      expect(head, page.outputPath).toMatch(/<meta\s+charset=/i)
      expect(head, page.outputPath).toMatch(
        /<meta\s+name="viewport"\s+content="width=device-width, initial-scale=1"\s*\/?>/
      )
      expect(head, page.outputPath).toMatch(
        /<link\s+rel="stylesheet"\s+href="\/assets\/css\/site\.css"\s*\/?>/
      )

      expect(anchors(section(html, 'header')), page.outputPath).toContainEqual({
        href: '/',
        text: 'Michael Moser'
      })

      expect(anchors(section(html, 'nav')), page.outputPath).toEqual([
        { href: '/writing/', text: 'Writing' },
        { href: '/experience/', text: 'Experience' },
        { href: '/about/', text: 'About' }
      ])

      expect(html, page.outputPath).toMatch(
        /<button\b[^>]*\bid="theme-toggle"[^>]*>/
      )

      const footerLinks = anchors(section(html, 'footer')).map(
        (link) => link.href
      )
      expect(footerLinks, page.outputPath).toContain(
        'https://github.com/michaeldmoser'
      )
      expect(footerLinks, page.outputPath).toContain(
        'https://www.linkedin.com/in/michaeldmoser/'
      )
    }
  })
})

describe('not found page', () => {
  it('renders a not found heading inside main with the shared header, nav, theme toggle and footer', () => {
    const page = results.find(
      (result) =>
        result.url === '/404.html' || result.outputPath.endsWith('404.html')
    )

    expect(page).toBeDefined()
    const html = page?.content ?? ''
    const main = html.match(/<main>([\s\S]*)<\/main>/)
    expect(main).not.toBeNull()
    const heading = main?.[1].match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/)
    expect(heading?.[1].replace(/<[^>]*>/g, '').toLowerCase()).toContain(
      'not found'
    )

    expect(section(html, 'header')).toContain('<a')
    expect(anchors(section(html, 'nav')).map((link) => link.href)).toEqual([
      '/writing/',
      '/experience/',
      '/about/'
    ])
    expect(html).toMatch(/<button\b[^>]*\bid="theme-toggle"[^>]*>/)
    expect(section(html, 'footer')).toContain('<a')
  })
})

describe('theme toggle without javascript', () => {
  it('ships exactly one theme toggle button that is a hidden type button on every built html page', () => {
    const pages = results.filter((result) =>
      result.outputPath.endsWith('.html')
    )
    expect(pages.length).toBeGreaterThan(0)

    for (const page of pages) {
      const toggles = [...page.content.matchAll(/<button\b[^>]*>/g)]
        .map((match) => match[0])
        .filter((tag) => /\bid="theme-toggle"/.test(tag))

      expect(toggles, page.outputPath).toHaveLength(1)
      expect(toggles[0], page.outputPath).toMatch(/\stype="button"/)
      expect(toggles[0], page.outputPath).toMatch(
        /\shidden(?=[\s>/=])(?:=(?:""|''))?/
      )
    }
  })
})

function hasNoPrintClass(tag: string) {
  const value = tag.match(/\sclass="([^"]*)"/)?.[1] ?? ''
  return value.split(/\s+/).includes('no-print')
}

describe('print markers', () => {
  it('marks the nav, theme toggle and footer links no-print on every built html page', () => {
    const pages = results.filter((result) =>
      result.outputPath.endsWith('.html')
    )
    expect(pages.length).toBeGreaterThan(0)

    for (const page of pages) {
      const html = page.content

      const navTag = html.match(/<nav[\s>][^>]*>?/)?.[0] ?? ''
      expect(hasNoPrintClass(navTag), `${page.outputPath} nav`).toBe(true)

      const toggleTag =
        html
          .match(/<button\b[^>]*>/g)
          ?.find((tag) => /\bid="theme-toggle"/.test(tag)) ?? ''
      expect(hasNoPrintClass(toggleTag), `${page.outputPath} toggle`).toBe(true)

      const footer = section(html, 'footer')
      const footerTag = footer.match(/<footer[^>]*>/)?.[0] ?? ''
      const linkTags = footer.match(/<a\s[^>]*>/g) ?? []
      expect(
        linkTags.length,
        `${page.outputPath} footer links`
      ).toBeGreaterThan(0)
      expect(
        hasNoPrintClass(footerTag) || linkTags.every(hasNoPrintClass),
        `${page.outputPath} footer`
      ).toBe(true)
    }
  })

  it('hides no-print elements with display none inside the print media block of site.css', () => {
    const css = readFileSync(
      new URL('../src/assets/css/site.css', import.meta.url),
      'utf8'
    )
    const hidden: string[] = []
    postcss.parse(css).walkAtRules('media', (media) => {
      if (!/\bprint\b/.test(media.params)) return
      media.walkRules((rule) => {
        const hides = rule.nodes.some(
          (node) =>
            node.type === 'decl' &&
            node.prop === 'display' &&
            node.value.replace(/\s*!important$/, '').trim() === 'none'
        )
        if (hides) hidden.push(rule.selector)
      })
    })

    expect(hidden.some((selector) => /\.no-print\b/.test(selector))).toBe(true)
  })
})
