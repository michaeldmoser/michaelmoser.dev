import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { register } from 'tsx/esm/api'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildScenario } from './scenario'

interface BuildResult {
  url: string
  content: string
  outputPath: string
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

function htmlPages(built: BuildResult[]) {
  return built.filter(
    (result) =>
      typeof result.content === 'string' && /<html[\s>]/i.test(result.content)
  )
}

function footerContactText(html: string) {
  const footer = html.match(/<footer[\s>][\s\S]*?<\/footer>/)?.[0] ?? ''
  const contact = footer.match(
    /<([a-z]+)\b[^>]*\sdata-contact(?:="[^"]*")?[^>]*>([\s\S]*?)<\/\1>/
  )
  return contact?.[2].replace(/<[^>]*>/g, '').trim()
}

describe('contact email with JavaScript off', () => {
  it('shows the readable fallback in every page footer and never emits a mailto link', () => {
    const pages = htmlPages(results)
    expect(pages.length).toBeGreaterThan(0)

    for (const page of pages) {
      expect(footerContactText(page.content), page.url).toBe(
        'reachoutto [at] michaelmoser [dot] dev'
      )
    }

    for (const result of results) {
      expect(String(result.content), result.url).not.toContain('mailto:')
    }
  })
})

interface Anchor {
  href: string
  textContent: string | null
}

function placeholdersIn(html: string) {
  return [...html.matchAll(/<[a-z]+\b[^>]*\sdata-contact="[^"]*"[^>]*>/g)].map(
    (match) => ({
      encoded: match[0].match(/\sdata-contact="([^"]*)"/)?.[1] ?? '',
      label: match[0].match(/\sdata-contact-label="([^"]*)"/)?.[1] ?? null
    })
  )
}

function runContactScript(html: string, built: BuildResult[] = results) {
  const script = built.find((result) => result.url === '/assets/js/contact.js')
  expect(script).toBeDefined()
  const placeholders = placeholdersIn(html)
  expect(placeholders.length).toBeGreaterThan(0)

  const replaced: Anchor[] = []
  const document = {
    querySelectorAll: () =>
      placeholders.map((placeholder) => ({
        getAttribute: (name: string) =>
          name === 'data-contact'
            ? placeholder.encoded
            : name === 'data-contact-label'
              ? placeholder.label
              : null,
        replaceWith: (node: Anchor) => {
          replaced.push(node)
        }
      })),
    createElement: (): Anchor => ({ href: '', textContent: null })
  }
  runInNewContext(
    script?.content ?? '',
    { document, atob: globalThis.atob },
    { timeout: 1000 }
  )

  return { placeholders, replaced }
}

describe('contact email with JavaScript on', () => {
  it.each(['/', '/about/', 'another'])(
    'turns every placeholder on %s into a labelled mailto link',
    (target) => {
      const pages = htmlPages(results)
      const page =
        target === 'another'
          ? pages.find(
              (result) => result.url !== '/' && result.url !== '/about/'
            )
          : pages.find((result) => result.url === target)
      expect(page).toBeDefined()

      const { placeholders, replaced } = runContactScript(page?.content ?? '')

      expect(replaced).toHaveLength(placeholders.length)
      replaced.forEach((anchor, index) => {
        expect(anchor.href).toBe('mailto:reachoutto@michaelmoser.dev')
        expect(anchor.textContent).toBe(placeholders[index].label ?? 'Email')
      })
    }
  )

  it('emits a self-contained contact.js with no import or export statements', () => {
    const script = results.find(
      (result) => result.url === '/assets/js/contact.js'
    )

    expect(script).toBeDefined()
    const content = script?.content ?? ''
    expect(content.trim()).not.toBe('')
    expect(content).not.toMatch(/^\s*import\s|\bimport\s*\(|^\s*export\s/m)
  })

  it('references contact.js with defer from the head of every built html page', () => {
    const pages = results.filter((result) =>
      result.outputPath.endsWith('.html')
    )
    expect(pages.length).toBeGreaterThan(0)

    for (const page of pages) {
      const head = page.content.match(/<head[\s>][\s\S]*?<\/head>/)?.[0] ?? ''
      const tags = [...head.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
      const external = tags.filter((tag) =>
        /\bsrc="\/assets\/js\/contact\.js"/.test(tag[1])
      )

      expect(external, page.outputPath).toHaveLength(1)
      expect(external[0][1], page.outputPath).toMatch(
        /\sdefer(?=[\s>/=]|$)(?:=(?:""|''))?/
      )
      expect(external[0][2].trim(), page.outputPath).toBe('')
    }
  })
})

describe('contact email changed in site data', () => {
  it('uses the new address in readable text and decoded links and leaves no trace of the old one', async () => {
    const outcome = await buildScenario('contact-changed')
    expect(outcome.error).toBeUndefined()
    const built = (outcome.results ?? []) as BuildResult[]
    const pages = htmlPages(built)
    expect(pages.length).toBeGreaterThan(0)

    for (const page of pages) {
      expect(footerContactText(page.content), page.url).toBe(
        'hello [at] mail [dot] example [dot] org'
      )
    }

    const home = pages.find((result) => result.url === '/')
    const { placeholders, replaced } = runContactScript(
      home?.content ?? '',
      built
    )
    expect(replaced).toHaveLength(placeholders.length)
    for (const anchor of replaced) {
      expect(anchor.href).toBe('mailto:hello@mail.example.org')
    }

    for (const result of built) {
      const content = String(result.content)
      expect(content, result.url).not.toContain('reachoutto@michaelmoser.dev')
      expect(content, result.url).not.toContain(
        'reachoutto [at] michaelmoser [dot] dev'
      )
    }
  }, 60_000)
})
