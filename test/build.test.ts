import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { XMLParser, XMLValidator } from 'fast-xml-parser'
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

function prePaintScript() {
  const html = results.find((result) => result.url === '/')?.content ?? ''
  const head = section(html, 'head')
  const first = head.match(/<script\b([^>]*)>([\s\S]*?)<\/script>/)
  return { head, attributes: first?.[1] ?? '', text: first?.[2] ?? '' }
}

function runPrePaintScript(storage: 'map' | 'throwing' | 'inaccessible') {
  const attributes = new Map<string, string>()
  const documentElement = {
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    getAttribute: (name: string) => attributes.get(name) ?? null,
    removeAttribute: (name: string) => attributes.delete(name)
  }
  const sandbox: Record<string, unknown> = {
    document: { documentElement }
  }
  sandbox.window = sandbox
  sandbox.self = sandbox
  sandbox.globalThis = sandbox
  if (storage === 'map') {
    const store = new Map([['theme', 'dark']])
    sandbox.localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key)
    }
  } else if (storage === 'throwing') {
    const fail = () => {
      throw new Error('storage blocked')
    }
    sandbox.localStorage = {
      getItem: fail,
      setItem: fail,
      removeItem: fail
    }
  } else {
    Object.defineProperty(sandbox, 'localStorage', {
      get() {
        throw new Error('storage inaccessible')
      }
    })
  }
  const run = () =>
    runInNewContext(prePaintScript().text, sandbox, { timeout: 1000 })
  return { run, attributes }
}

describe('pre-paint theme script', () => {
  it('is the first script in head, inline, and ahead of the site stylesheet', () => {
    const { head, attributes, text } = prePaintScript()

    expect(text.trim()).not.toBe('')
    expect(attributes).not.toMatch(/\bsrc\s*=/)
    const scriptStart = head.search(/<script\b/)
    const stylesheetStart = head.search(
      /<link\s+rel="stylesheet"\s+href="\/assets\/css\/site\.css"/
    )
    expect(stylesheetStart).toBeGreaterThan(-1)
    expect(scriptStart).toBeGreaterThan(-1)
    expect(scriptStart).toBeLessThan(stylesheetStart)
    const opens = head.match(/<script\b/g) ?? []
    const closes = head.match(/<\/script>/g) ?? []
    expect(closes).toHaveLength(opens.length)
  })

  it('sets data-theme dark on the root when dark is stored', () => {
    const { run, attributes } = runPrePaintScript('map')

    run()

    expect(attributes.get('data-theme')).toBe('dark')
  })

  it('does not throw and sets no data-theme when storage methods throw', () => {
    const { run, attributes } = runPrePaintScript('throwing')

    expect(run).not.toThrow()
    expect(attributes.has('data-theme')).toBe(false)
  })

  it('does not throw and sets no data-theme when reading localStorage itself throws', () => {
    const { run, attributes } = runPrePaintScript('inaccessible')

    expect(run).not.toThrow()
    expect(attributes.has('data-theme')).toBe(false)
  })
})

describe('writing index with no posts', () => {
  it('tells the reader the first posts are coming soon', () => {
    const page = results.find((result) => result.url === '/writing/')

    expect(page).toBeDefined()
    const main = page?.content.match(/<main[\s>]([\s\S]*)<\/main>/)
    expect(main).not.toBeNull()
    const text = (main?.[1] ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
    expect(text).toContain('First posts coming soon')
  })

  it('builds no page under /writing/ other than the index', () => {
    const others = results
      .filter((result) => result.url.startsWith('/writing/'))
      .map((result) => result.url)
      .filter((url) => url !== '/writing/')

    expect(others).toEqual([])
  })
})

describe('atom feed with no posts', () => {
  const feedXml = () =>
    results.find((result) => result.url === '/feed.xml')?.content ?? ''

  it('is a well-formed feed with the required elements, a name-only author and no entries', () => {
    const xml = feedXml()

    expect(xml).not.toBe('')
    expect(XMLValidator.validate(xml)).toBe(true)
    const { feed } = new XMLParser({
      ignoreAttributes: false,
      parseTagValue: false
    }).parse(xml)
    expect(feed['@_xmlns']).toBe('http://www.w3.org/2005/Atom')
    expect(feed.id).toBe('https://michaelmoser.dev/feed.xml')
    expect(feed.title).toBe('Michael Moser — Writing')
    expect(feed.author.name).toBe('Michael Moser')
    expect(feed.author.email).toBeUndefined()
    expect(feed.entry).toBeUndefined()
    expect(xml).not.toContain('<email')
  })

  it('carries a valid RFC 3339 updated date', () => {
    const { feed } = new XMLParser({ parseTagValue: false }).parse(feedXml())

    expect(feed.updated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(Number.isNaN(new Date(feed.updated).getTime())).toBe(false)
  })

  it('is byte-identical across two independent builds', async () => {
    const { default: Eleventy } = await import('@11ty/eleventy')
    const second = await new Eleventy('src', '_site', {
      configPath: 'eleventy.config.ts'
    }).toJSON()
    const secondXml =
      second.find((result: BuildResult) => result.url === '/feed.xml')
        ?.content ?? ''

    expect(feedXml()).not.toBe('')
    expect(secondXml).toBe(feedXml())
  }, 60_000)
})

function attributeValue(tag: string, name: string) {
  return tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1]
}

describe('feed autodiscovery', () => {
  it('links the atom feed from the head of every built html page', () => {
    const pages = results.filter((result) =>
      result.outputPath.endsWith('.html')
    )
    expect(pages.length).toBeGreaterThan(0)

    for (const page of pages) {
      const head = section(page.content, 'head')
      const feedLinks = (head.match(/<link\b[^>]*>/g) ?? []).filter(
        (tag) =>
          attributeValue(tag, 'rel') === 'alternate' &&
          attributeValue(tag, 'type') === 'application/atom+xml' &&
          attributeValue(tag, 'href') === '/feed.xml'
      )

      expect(feedLinks, page.outputPath).toHaveLength(1)
    }
  })
})

describe('theme toggle script', () => {
  it('emits a self-contained theme.js with no import or export statements', () => {
    const script = results.find(
      (result) => result.url === '/assets/js/theme.js'
    )

    expect(script).toBeDefined()
    const content = script?.content ?? ''
    expect(content.trim()).not.toBe('')
    expect(content).not.toMatch(/^\s*import\s|\bimport\s*\(|^\s*export\s/m)
  })

  it('references theme.js with defer from the head of every built html page', () => {
    const pages = results.filter((result) =>
      result.outputPath.endsWith('.html')
    )
    expect(pages.length).toBeGreaterThan(0)

    for (const page of pages) {
      const head = section(page.content, 'head')
      const tags = [...head.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
      const external = tags.filter((tag) =>
        /\bsrc="\/assets\/js\/theme\.js"/.test(tag[1])
      )

      expect(external, page.outputPath).toHaveLength(1)
      expect(external[0][1], page.outputPath).toMatch(
        /\sdefer(?=[\s>/=]|$)(?:=(?:""|''))?/
      )
      expect(external[0][2].trim(), page.outputPath).toBe('')
    }
  })
})
