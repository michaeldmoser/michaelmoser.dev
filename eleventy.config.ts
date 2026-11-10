import { join } from 'node:path'
import type { CollectionApi, CollectionItem, UserConfig } from '@11ty/eleventy'
import { build } from 'esbuild'
import { checkPosts, type Vocabulary } from './lib/posts.ts'
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
  const { posts } = checkPosts([...byEntry.keys()], vocabulary, {
    runMode: 'build',
    env: {}
  })
  return posts.map((entry) => byEntry.get(entry) as CollectionItem)
}

function listedPost(item: CollectionItem) {
  return {
    url: item.url,
    date: item.date,
    data: { title: item.data.title, description: item.data.description }
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
