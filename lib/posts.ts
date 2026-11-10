import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

export type PostEntry = {
  inputPath: string
  frontmatter: Record<string, unknown>
}
export type RunContext = {
  runMode: 'build' | 'serve' | 'watch'
  env: Record<string, string | undefined>
}
export type Vocabulary = Record<string, string>

function isNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim() !== ''
}

function isParseableDate(value: unknown): boolean {
  if (value instanceof Date) {
    return !Number.isNaN(value.getTime())
  }
  return (
    isNonEmptyString(value) &&
    !Number.isNaN(new Date(value as string).getTime())
  )
}

const REQUIRED_FIELDS: Array<[string, (value: unknown) => boolean]> = [
  ['title', isNonEmptyString],
  ['date', isParseableDate],
  ['description', isNonEmptyString]
]

function requiredFieldViolations(entry: PostEntry): string[] {
  return REQUIRED_FIELDS.filter(
    ([field, isValid]) => !isValid(entry.frontmatter[field])
  ).map(([field]) => `${entry.inputPath}: missing or invalid ${field}`)
}

function normalizeTags(tags: unknown): unknown[] {
  if (Array.isArray(tags)) {
    return tags
  }
  return typeof tags === 'string' ? [tags] : []
}

function tagViolations(entry: PostEntry, vocabulary: Vocabulary): string[] {
  return normalizeTags(entry.frontmatter.tags)
    .filter((tag) => typeof tag !== 'string' || !Object.hasOwn(vocabulary, tag))
    .map((tag) => `${entry.inputPath}: unknown tag "${String(tag)}"`)
}

const OG_IMAGE_EXTENSION = /\.(png|jpg)$/i

function ogImageViolations(
  entry: PostEntry,
  fileExists: (path: string) => boolean
): string[] {
  const ogImage = entry.frontmatter.ogImage
  if (ogImage === undefined) {
    return []
  }
  if (typeof ogImage !== 'string' || !OG_IMAGE_EXTENSION.test(ogImage)) {
    return [`${entry.inputPath}: ogImage must be a .png or .jpg file`]
  }
  if (!fileExists(join(dirname(entry.inputPath), ogImage))) {
    return [`${entry.inputPath}: ogImage file "${ogImage}" does not exist`]
  }
  return []
}

function postTime(entry: PostEntry): number {
  return new Date(entry.frontmatter.date as Date | string).getTime()
}

const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/

function postFolder(inputPath: string): string | null {
  const segments = inputPath.split('/')
  const writingIndex = segments.indexOf('writing')
  if (writingIndex === -1) {
    return null
  }
  const relative = segments.slice(writingIndex + 1)
  if (relative.length !== 2 || relative[1] !== 'index.md') {
    return null
  }
  return relative[0]
}

function locationViolations(entry: PostEntry): string[] {
  const folder = postFolder(entry.inputPath)
  if (folder === null) {
    return [
      `${entry.inputPath}: not a post location, expected writing/<slug>/index.md`
    ]
  }
  if (!KEBAB_CASE.test(folder)) {
    return [
      `${entry.inputPath}: folder "${folder}" is not lowercase kebab-case`
    ]
  }
  return []
}

function collisionGroups(entries: PostEntry[]): PostEntry[][] {
  const byFolder = new Map<string, PostEntry[]>()
  for (const entry of entries) {
    const folder = postFolder(entry.inputPath)
    if (folder !== null) {
      const key = folder.toLowerCase()
      byFolder.set(key, [...(byFolder.get(key) ?? []), entry])
    }
  }
  return [...byFolder.values()].filter((group) => group.length > 1)
}

export function isCi(env: RunContext['env']): boolean {
  return Boolean(env.CI) || Boolean(env.WORKERS_CI)
}

export function draftPolicy(
  context: RunContext
): 'render' | 'exclude' | 'fail' {
  if (isCi(context.env)) {
    return 'fail'
  }
  return context.runMode === 'serve' ? 'render' : 'exclude'
}

function isDraft(entry: PostEntry): boolean {
  return entry.frontmatter.draft === true
}

export function checkPosts(
  entries: PostEntry[],
  vocabulary: Vocabulary,
  context: RunContext,
  fileExists: (path: string) => boolean = existsSync
): { posts: PostEntry[]; violations: string[]; warnings: string[] } {
  const invalid = new Set<PostEntry>()
  const violations: string[] = []
  for (const entry of entries) {
    const entryViolations = [
      ...locationViolations(entry),
      ...requiredFieldViolations(entry),
      ...tagViolations(entry, vocabulary),
      ...ogImageViolations(entry, fileExists)
    ]
    if (entryViolations.length > 0) {
      invalid.add(entry)
      violations.push(...entryViolations)
    }
  }
  for (const group of collisionGroups(entries)) {
    const paths = group.map((entry) => entry.inputPath).join(', ')
    violations.push(`${paths}: folders match case-insensitively`)
    for (const entry of group) {
      invalid.add(entry)
    }
  }
  const policy = draftPolicy(context)
  const warnings: string[] = []
  for (const entry of entries.filter(isDraft)) {
    if (policy === 'fail') {
      invalid.add(entry)
      violations.push(`${entry.inputPath}: draft posts are not allowed in CI`)
    } else if (policy === 'exclude') {
      invalid.add(entry)
      warnings.push(`${entry.inputPath}: draft excluded from the build`)
    }
  }
  const posts = entries
    .filter((entry) => !invalid.has(entry))
    .sort((a, b) => postTime(b) - postTime(a))
  return { posts, violations, warnings }
}
