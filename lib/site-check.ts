import { access, readdir, readFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

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

export async function checkSite(
  dir: string,
  options: SiteCheckOptions
): Promise<{ errors: Problem[]; warnings: string[] }> {
  const errors: Problem[] = []
  const warnings: string[] = []
  const paths = await listFiles(dir)
  const files = new Set(paths)
  for (const page of paths.filter((path) => path.endsWith('.html'))) {
    const html = await readFile(join(dir, page), 'utf8')
    errors.push(...missingReferenceProblems(page, html, files))
  }
  if (
    !options.env.PRIVATE_TERMS &&
    !(await fileExists(options.privateTermsPath))
  ) {
    warnings.push(
      'No private-terms denylist configured; skipped the denylist scan'
    )
  }
  return { errors, warnings }
}
