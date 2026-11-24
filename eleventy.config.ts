import { copyFileSync, readdirSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import type {
  BuildResult,
  CollectionApi,
  CollectionItem,
  UserConfig
} from '@11ty/eleventy'
import { eleventyImageTransformPlugin } from '@11ty/eleventy-img'
import syntaxHighlight from '@11ty/eleventy-plugin-syntaxhighlight'
import { build } from 'esbuild'
import { load } from 'js-yaml'
import markdownItContainer from 'markdown-it-container'
import { calloutLabel, parseCalloutType } from './lib/callouts.ts'
import { encodeAddress, readableAddress } from './lib/contact.ts'
import { altProblem, diagramClasses, isLocalImage } from './lib/images.ts'
import {
  checkPosts,
  draftPolicy,
  type RunContext,
  selectFeatured,
  type Vocabulary
} from './lib/posts.ts'
import { checkResume } from './lib/resume.ts'
import { tsxExtension } from './lib/tsx.ts'

async function bundleBrowserScript(entry: string): Promise<string> {
  const result = await build({
    entryPoints: [join(import.meta.dirname, 'src/_includes/scripts', entry)],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    minify: true,
    write: false
  })
  return result.outputFiles[0].text
}

function runContext(): RunContext {
  return {
    runMode: (process.env.ELEVENTY_RUN_MODE ??
      'build') as RunContext['runMode'],
    env: process.env
  }
}

function isWritingMarkdown(item: Pick<CollectionItem, 'inputPath'>): boolean {
  const segments = item.inputPath.split('/')
  return item.inputPath.endsWith('.md') && segments.includes('writing')
}

function vocabularyOf(collectionApi: CollectionApi): Vocabulary {
  return (collectionApi.getAll()[0]?.data.tagVocabulary ?? {}) as Vocabulary
}

function orderedPosts(collectionApi: CollectionApi): CollectionItem[] {
  const writing = collectionApi.getAll().filter(isWritingMarkdown)
  const vocabulary = vocabularyOf(collectionApi)
  const byEntry = new Map(
    writing.map((item) => [
      { inputPath: item.inputPath, frontmatter: item.data },
      item
    ])
  )
  const { posts, violations } = checkPosts(
    [...byEntry.keys()],
    vocabulary,
    runContext()
  )
  if (violations.length > 0) {
    throw new Error(`Invalid posts:\n${violations.join('\n')}`)
  }
  return posts.map((entry) => byEntry.get(entry) as CollectionItem)
}

function listedPost(item: CollectionItem) {
  return {
    url: item.url,
    date: item.date,
    data: {
      title: item.data.title,
      description: item.data.description,
      draft: item.data.draft
    }
  }
}

function featuredPosts(collectionApi: CollectionApi) {
  const byEntry = new Map(
    orderedPosts(collectionApi).map((item) => [
      { inputPath: item.inputPath, frontmatter: item.data },
      item
    ])
  )
  const { featured, violations } = selectFeatured([...byEntry.keys()])
  if (violations.length > 0) {
    throw new Error(`Invalid featured posts:\n${violations.join('\n')}`)
  }
  return featured.map((entry) => byEntry.get(entry) as CollectionItem)
}

function tagPages(collectionApi: CollectionApi) {
  const posts = orderedPosts(collectionApi)
  return Object.entries(vocabularyOf(collectionApi))
    .map(([tag, label]) => ({
      tag,
      label,
      posts: posts
        .filter((post) => [post.data.tags ?? []].flat().includes(tag))
        .map(listedPost)
    }))
    .filter((page) => page.posts.length > 0)
}

function shapedResume(collectionApi: CollectionApi) {
  const data = collectionApi.getAll()[0]?.data
  const postSlugs = new Set(
    orderedPosts(collectionApi).map(
      (post) => post.url.split('/').filter(Boolean).pop() as string
    )
  )
  const { resume, violations } = checkResume(data?.resume, {
    postSlugs,
    siteUrl: (data?.site as { url: string } | undefined)?.url ?? ''
  })
  if (violations.length > 0) {
    throw new Error(`Invalid resume:\n${violations.join('\n')}`)
  }
  return resume
}

const highlightedLanguages = new Set([
  'ruby',
  'erb',
  'javascript',
  'typescript',
  'jsx',
  'tsx',
  'handlebars',
  'hcl',
  'yaml',
  'sql',
  'bash',
  'dockerfile',
  'json',
  'python'
])

type Highlight = (code: string, language: string, attrs: string) => string

interface MarkdownLibrary {
  options: { highlight?: Highlight | null }
  utils: { escapeHtml(text: string): string }
  set(options: { highlight: Highlight }): void
}

function restrictHighlighting(md: MarkdownLibrary) {
  const highlight = md.options.highlight
  md.set({
    highlight: (code, language, attrs) => {
      if (!highlight || !highlightedLanguages.has(language.split('/')[0])) {
        return `<pre><code>${md.utils.escapeHtml(code)}</code></pre>`
      }
      return highlight(code, language, attrs)
    }
  })
}

function addCallouts(md: unknown) {
  markdownItContainer(md, 'callout', {
    validate: () => true,
    render: (tokens, idx, _options, env) => {
      const { info, nesting } = tokens[idx]
      if (nesting !== 1) {
        return '</aside>\n'
      }
      const type = parseCalloutType(info, env.page.inputPath)
      return `<aside class="callout callout-${type}">\n<p class="callout-label">${calloutLabel(type)}</p>\n`
    }
  })
}

interface ImageToken {
  content: string
  attrGet(name: string): string | null
  attrSet(name: string, value: string): void
}

type ImageRule = (
  tokens: ImageToken[],
  idx: number,
  options: unknown,
  env: { page: { inputPath: string } },
  self: unknown
) => string

interface ImageRenderer {
  renderer: {
    rules: { image: ImageRule }
    renderToken: ImageRule
  }
}

function requireAltText(md: ImageRenderer) {
  const render = md.renderer.rules.image
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    const src = token.attrGet('src') ?? ''
    const problem = altProblem(src, token.content, env.page.inputPath)
    if (problem) {
      throw new Error(problem)
    }
    const classes = isLocalImage(src) ? diagramClasses(src) : []
    if (!isLocalImage(src) || classes.length > 0) {
      token.attrSet('eleventy:ignore', '')
    }
    if (classes.length > 0) {
      token.attrSet('class', classes.join(' '))
    }
    return render(tokens, idx, options, env, self)
  }
}

const copiedImageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']

function copyPostImages(results: BuildResult[]) {
  for (const { inputPath, outputPath } of results) {
    if (!isWritingMarkdown({ inputPath })) {
      continue
    }
    const sourceDir = dirname(inputPath)
    for (const name of readdirSync(sourceDir)) {
      if (copiedImageExtensions.includes(extname(name))) {
        copyFileSync(join(sourceDir, name), join(dirname(outputPath), name))
      }
    }
  }
}

export default function (eleventyConfig: UserConfig) {
  eleventyConfig.on('eleventy.after', ({ results, outputMode }) => {
    if (outputMode === 'fs') {
      copyPostImages(results)
    }
  })
  eleventyConfig.addPlugin(syntaxHighlight)
  eleventyConfig.htmlTransformer.setPosthtmlProcessOptions({
    recognizeNoValueAttribute: true
  })
  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    formats: ['avif', 'webp', 'auto'],
    widths: [720, 1440, 'auto'],
    htmlOptions: {
      imgAttributes: {
        loading: 'lazy',
        decoding: 'async',
        sizes: '(min-width: 65ch) 65ch, 100vw'
      }
    }
  })
  eleventyConfig.amendLibrary('md', restrictHighlighting)
  eleventyConfig.amendLibrary('md', requireAltText)
  eleventyConfig.amendLibrary('md', addCallouts)
  eleventyConfig.addPreprocessor(
    'excludeDrafts',
    'md',
    (data: { draft?: unknown; page: { inputPath: string } }) => {
      if (data.draft !== true || draftPolicy(runContext()) !== 'exclude') {
        return undefined
      }
      console.warn(`${data.page.inputPath}: draft excluded from the build`)
      return false
    }
  )
  eleventyConfig.addDataExtension('yaml', (contents: string) => load(contents))
  eleventyConfig.addCollection('posts', orderedPosts)
  eleventyConfig.addCollection('resume', shapedResume)
  eleventyConfig.addCollection('featuredPosts', featuredPosts)
  eleventyConfig.addCollection('tagPages', tagPages)
  eleventyConfig.addGlobalData(
    'eleventyComputed.contact',
    () => (data: { site: { contactEmail: string } }) => ({
      encoded: encodeAddress(data.site.contactEmail),
      readable: readableAddress(data.site.contactEmail)
    })
  )
  eleventyConfig.addGlobalData('prePaintScript', () =>
    bundleBrowserScript('pre-paint.ts')
  )
  eleventyConfig.addGlobalData('themeScript', () =>
    bundleBrowserScript('theme-toggle.ts')
  )
  eleventyConfig.addGlobalData('contactScript', () =>
    bundleBrowserScript('contact.ts')
  )
  eleventyConfig.addGlobalData('copyCodeScript', () =>
    bundleBrowserScript('copy-code.ts')
  )
  eleventyConfig.addWatchTarget('src/_includes/css/site.css')
  eleventyConfig.addTemplateFormats('11ty.tsx')
  eleventyConfig.addExtension('11ty.tsx', tsxExtension)
  eleventyConfig.addTemplateFormats('11ty.ts')
  eleventyConfig.addExtension('11ty.ts', { key: '11ty.js' })
  return {
    markdownTemplateEngine: false
  }
}
