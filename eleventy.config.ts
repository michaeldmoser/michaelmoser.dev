import { join } from 'node:path'
import type { CollectionApi, CollectionItem, UserConfig } from '@11ty/eleventy'
import syntaxHighlight from '@11ty/eleventy-plugin-syntaxhighlight'
import { build } from 'esbuild'
import markdownItContainer from 'markdown-it-container'
import { calloutLabel, parseCalloutType } from './lib/callouts.ts'
import { encodeAddress, readableAddress } from './lib/contact.ts'
import { altProblem } from './lib/images.ts'
import {
  checkPosts,
  draftPolicy,
  type RunContext,
  selectFeatured,
  type Vocabulary
} from './lib/posts.ts'
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

function isWritingMarkdown(item: CollectionItem): boolean {
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
    const problem = altProblem(
      token.attrGet('src') ?? '',
      token.content,
      env.page.inputPath
    )
    if (problem) {
      throw new Error(problem)
    }
    return render(tokens, idx, options, env, self)
  }
}

export default function (eleventyConfig: UserConfig) {
  eleventyConfig.addPlugin(syntaxHighlight)
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
  eleventyConfig.addCollection('posts', orderedPosts)
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
