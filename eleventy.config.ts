import { join } from 'node:path'
import type { CollectionApi, CollectionItem, UserConfig } from '@11ty/eleventy'
import { build } from 'esbuild'
import {
  checkPosts,
  draftPolicy,
  type RunContext,
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

export default function (eleventyConfig: UserConfig) {
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
  eleventyConfig.addCollection('tagPages', tagPages)
  eleventyConfig.addGlobalData('prePaintScript', () =>
    bundleBrowserScript('pre-paint.ts')
  )
  eleventyConfig.addGlobalData('themeScript', () =>
    bundleBrowserScript('theme-toggle.ts')
  )
  eleventyConfig.addPassthroughCopy('src/assets/css')
  eleventyConfig.addTemplateFormats('11ty.tsx')
  eleventyConfig.addExtension('11ty.tsx', tsxExtension)
  return {
    markdownTemplateEngine: false
  }
}
