import { createHash } from 'node:crypto'
import { access, readdir, readFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { HtmlValidate } from 'html-validate'
import { classProblems, SITE_CSS_PATH } from './class-check.ts'
import { isCi } from './posts.ts'

export type Problem = { file: string; message: string }

export type SiteCheckOptions = {
  env: Record<string, string | undefined>
  privateTermsPath: string
  contactEmail: string
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

const SITE_ORIGIN = 'https://michaelmoser.dev'

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) =>
      relative(dir, join(entry.parentPath, entry.name)).split(sep).join('/')
    )
}

const REFERENCE_ATTRIBUTES: Record<string, string[]> = {
  a: ['href'],
  link: ['href'],
  img: ['src', 'srcset'],
  script: ['src'],
  source: ['src', 'srcset']
}

function attributeValue(tag: string, name: string): string | null {
  const match = tag.match(
    new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i')
  )
  return match ? (match[1] ?? match[2]) : null
}

function srcsetUrls(srcset: string): string[] {
  return srcset
    .split(',')
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .filter((url) => url !== '')
}

function references(html: string): string[] {
  return [...html.matchAll(/<(a|link|img|script|source)\s[^>]*>/gi)].flatMap(
    (match) =>
      REFERENCE_ATTRIBUTES[match[1].toLowerCase()].flatMap((name) => {
        const value = attributeValue(match[0], name)
        if (value === null) {
          return []
        }
        return name === 'srcset' ? srcsetUrls(value) : [value]
      })
  )
}

function internalPath(href: string, page: string): string | null {
  let url: URL
  try {
    url = new URL(href, `${SITE_ORIGIN}/${page}`)
  } catch {
    return null
  }
  if (url.origin !== SITE_ORIGIN) {
    return null
  }
  try {
    return decodeURIComponent(url.pathname).slice(1)
  } catch {
    return url.pathname.slice(1)
  }
}

function targetExists(path: string, files: Set<string>): boolean {
  if (files.has(path)) {
    return true
  }
  const stem = path.replace(/\/$/, '').replace(/\.html$/, '')
  if (stem === '') {
    return files.has('index.html')
  }
  return files.has(`${stem}.html`) || files.has(`${stem}/index.html`)
}

function missingReferenceProblems(
  page: string,
  html: string,
  files: Set<string>
): Problem[] {
  return references(html)
    .filter((reference) => {
      const path = internalPath(reference, page)
      return path !== null && !targetExists(path, files)
    })
    .map((reference) => ({
      file: page,
      message: `broken internal link ${reference}`
    }))
}

async function createValidator(): Promise<HtmlValidate> {
  const config = JSON.parse(
    await readFile(new URL('../.htmlvalidate.json', import.meta.url), 'utf8')
  )
  return new HtmlValidate(config)
}

async function invalidHtmlProblems(
  validator: HtmlValidate,
  page: string,
  html: string
): Promise<Problem[]> {
  const report = await validator.validateString(html, page)
  return report.results.flatMap((result) =>
    result.messages.map((message) => ({
      file: page,
      message: `${message.ruleId}: ${message.message} (line ${message.line})`
    }))
  )
}

const PRIVACY_SCANNED_EXTENSIONS = ['.html', '.xml', '.json', '.txt']

const NAMED_ENTITIES: Record<string, string> = {
  commat: '@',
  period: '.',
  amp: '&',
  lowbar: '_',
  plus: '+'
}

const ENTITY_PATTERN = /&(?:#(\d+)|#x([0-9a-f]+)|([a-z][a-z0-9]*));/gi

function decodeEntity(
  entity: string,
  decimal: string | undefined,
  hex: string | undefined,
  name: string | undefined
): string {
  if (name !== undefined) {
    return NAMED_ENTITIES[name.toLowerCase()] ?? entity
  }
  const codePoint =
    decimal !== undefined
      ? Number.parseInt(decimal, 10)
      : Number.parseInt(hex ?? '', 16)
  return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity
}

function decodeEntities(text: string): string {
  return text.replace(ENTITY_PATTERN, decodeEntity)
}

function decodePercentEncoding(text: string): string {
  return text.replace(/%([0-9a-f]{2})/gi, (_, code) =>
    String.fromCharCode(Number.parseInt(code, 16))
  )
}

function containsContactEmail(text: string, contactEmail: string): boolean {
  const decoded = decodePercentEncoding(decodeEntities(text))
  return decoded.toLowerCase().includes(contactEmail.toLowerCase())
}

const US_PHONE_PATTERN =
  /(?<!\d)(?:\+?1[\s.-]*)?\(?[2-9]\d{2}\)?[\s.-]*[2-9]\d{2}[\s.-]*\d{4}(?!\d)/

function phoneNumberLine(text: string): number | null {
  const index = text
    .split('\n')
    .findIndex((line) => US_PHONE_PATTERN.test(line))
  return index === -1 ? null : index + 1
}

function parseTerms(raw: string | undefined): string[] {
  return (raw ?? '')
    .split('|')
    .map((term) => term.trim())
    .filter((term) => term !== '')
}

async function loadTerms(options: SiteCheckOptions): Promise<string[]> {
  const fromEnv = parseTerms(options.env.PRIVATE_TERMS)
  if (fromEnv.length > 0) {
    return fromEnv
  }
  if (!(await fileExists(options.privateTermsPath))) {
    return []
  }
  return parseTerms(await readFile(options.privateTermsPath, 'utf8'))
}

function termHash(term: string): string {
  return createHash('sha256')
    .update(term.toLowerCase())
    .digest('hex')
    .slice(0, 12)
}

async function privacyProblems(
  dir: string,
  paths: string[],
  contactEmail: string,
  terms: string[]
): Promise<Problem[]> {
  const problems: Problem[] = []
  for (const path of paths) {
    if (!PRIVACY_SCANNED_EXTENSIONS.some((ext) => path.endsWith(ext))) {
      continue
    }
    const text = await readFile(join(dir, path), 'utf8')
    if (containsContactEmail(text, contactEmail)) {
      problems.push({
        file: path,
        message: `contact address ${contactEmail} appears in built output`
      })
    }
    const phoneLine = phoneNumberLine(text)
    if (phoneLine !== null) {
      problems.push({
        file: path,
        message: `US phone number appears on line ${phoneLine}`
      })
    }
    const lowered = text.toLowerCase()
    for (const term of terms) {
      if (lowered.includes(term.toLowerCase())) {
        problems.push({
          file: path,
          message: `denylisted term with hash ${termHash(term)} appears in built output`
        })
      }
    }
  }
  return problems
}

function devOnlyProblems(paths: string[]): Problem[] {
  return paths
    .filter((path) => path.startsWith('style-guide/'))
    .map((path) => ({
      file: path,
      message: 'dev-only style guide page must not be in built output'
    }))
}

function fontFaceBlocks(css: string): string[] {
  return [...css.matchAll(/@font-face\s*\{[^}]*\}/gi)].map(
    (match) => match[0]
  )
}

function fontFaceUrls(block: string): string[] {
  return [
    ...block.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)/gi)
  ].map((match) => match[1] ?? match[2] ?? match[3])
}

function declaredWoff2Paths(css: string): string[] {
  return fontFaceBlocks(css).flatMap((block) =>
    fontFaceUrls(block)
      .filter((url) => /\.woff2(?:[?#].*)?$/i.test(url))
      .map((url) => internalPath(url, SITE_CSS_PATH))
      .filter((path): path is string => path !== null)
  )
}

function fontFaceDescriptor(block: string, name: string): string | null {
  const match = block.match(new RegExp(`${name}\\s*:\\s*([^;}]+)`, 'i'))
  return match ? match[1].trim().replace(/^["']|["']$/g, '').toLowerCase() : null
}

function foreignFontHosts(css: string): string[] {
  const hosts = fontFaceBlocks(css)
    .flatMap(fontFaceUrls)
    .flatMap((url) => {
      try {
        const parsed = new URL(url, `${SITE_ORIGIN}/${SITE_CSS_PATH}`)
        const external =
          /^https?:$/.test(parsed.protocol) && parsed.origin !== SITE_ORIGIN
        return external ? [parsed.host] : []
      } catch {
        return []
      }
    })
  return [...new Set(hosts)]
}

function fontLimitProblems(css: string): Problem[] {
  const blocks = fontFaceBlocks(css)
  const distinct = (name: string) => [
    ...new Set(
      blocks
        .map((block) => fontFaceDescriptor(block, name))
        .filter((value): value is string => value !== null)
    )
  ]
  const families = distinct('font-family')
  const weights = distinct('font-weight')
  const messages = [
    ...(families.length > 1
      ? [`font families limited to one, found ${families.join(', ')}`]
      : []),
    ...(weights.length > 2
      ? [`font weights limited to two, found ${weights.join(', ')}`]
      : []),
    ...foreignFontHosts(css).map(
      (host) => `font files must be self-hosted, found ${host}`
    )
  ]
  return messages.map((message) => ({ file: SITE_CSS_PATH, message }))
}

function preloadedFontPaths(page: string, html: string): Set<string> {
  const paths = [...html.matchAll(/<link\s[^>]*>/gi)]
    .map((match) => match[0])
    .filter(
      (tag) =>
        attributeValue(tag, 'rel')?.toLowerCase() === 'preload' &&
        attributeValue(tag, 'as')?.toLowerCase() === 'font' &&
        attributeValue(tag, 'type')?.toLowerCase() === 'font/woff2' &&
        /\scrossorigin(?=[\s=>/])/i.test(tag)
    )
    .map((tag) => attributeValue(tag, 'href'))
    .filter((href): href is string => href !== null)
    .map((href) => internalPath(href, page))
    .filter((path): path is string => path !== null)
  return new Set(paths)
}

function fontPreloadProblems(
  pages: { file: string; html: string }[],
  css: string
): Problem[] {
  const fonts = declaredWoff2Paths(css)
  return pages.flatMap(({ file, html }) => {
    const preloaded = preloadedFontPaths(file, html)
    return fonts
      .filter((font) => !preloaded.has(font))
      .map((font) => ({
        file,
        message: `missing font preload with crossorigin for ${font}`
      }))
  })
}

function iconLinkHrefs(html: string): string[] {
  return [...html.matchAll(/<link\s[^>]*>/gi)]
    .map((match) => match[0])
    .filter((tag) =>
      (attributeValue(tag, 'rel') ?? '').toLowerCase().split(/\s+/).includes('icon')
    )
    .map((tag) => attributeValue(tag, 'href') ?? '')
}

function faviconProblems(
  pages: { file: string; html: string }[],
  hasFaviconFile: boolean
): Problem[] {
  return pages.flatMap(({ file, html }) => {
    const hrefs = iconLinkHrefs(html)
    if (hrefs.some((href) => /^data:image\/svg\+xml/i.test(href))) {
      return [{ file, message: 'favicon must not be a data-uri icon' }]
    }
    if (hasFaviconFile && !hrefs.includes('/favicon.svg')) {
      return [{ file, message: 'missing favicon link to /favicon.svg' }]
    }
    return []
  })
}

export async function checkSite(
  dir: string,
  options: SiteCheckOptions
): Promise<{ errors: Problem[]; warnings: string[] }> {
  const errors: Problem[] = []
  const warnings: string[] = []
  const paths = await listFiles(dir)
  const files = new Set(paths)
  errors.push(...devOnlyProblems(paths))
  const validator = await createValidator()
  const pages: { file: string; html: string }[] = []
  for (const page of paths.filter((path) => path.endsWith('.html'))) {
    const html = await readFile(join(dir, page), 'utf8')
    pages.push({ file: page, html })
    errors.push(...missingReferenceProblems(page, html, files))
    errors.push(...(await invalidHtmlProblems(validator, page, html)))
  }
  errors.push(...faviconProblems(pages, files.has('favicon.svg')))
  if (files.has(SITE_CSS_PATH)) {
    const css = await readFile(join(dir, SITE_CSS_PATH), 'utf8')
    errors.push(...classProblems(pages, css))
    errors.push(...fontPreloadProblems(pages, css))
    errors.push(...fontLimitProblems(css))
  }
  const terms = await loadTerms(options)
  errors.push(
    ...(await privacyProblems(dir, paths, options.contactEmail, terms))
  )
  if (terms.length === 0 && isCi(options.env)) {
    errors.push({
      file: options.privateTermsPath,
      message: 'Private-terms denylist is missing'
    })
  } else if (terms.length === 0) {
    warnings.push(
      'No private-terms denylist configured; skipped the denylist scan'
    )
  }
  return { errors, warnings }
}
