import { join } from 'node:path'
import type { UserConfig } from '@11ty/eleventy'
import { build } from 'esbuild'
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

export default function (eleventyConfig: UserConfig) {
  eleventyConfig.addGlobalData('prePaintScript', () =>
    bundleBrowserScript('pre-paint.ts')
  )
  eleventyConfig.addGlobalData('themeScript', () =>
    bundleBrowserScript('theme-toggle.ts')
  )
  eleventyConfig.addTemplateFormats('11ty.tsx')
  eleventyConfig.addExtension('11ty.tsx', tsxExtension)
  return {
    markdownTemplateEngine: false,
    dir: { input: 'src', output: '_site' }
  }
}
