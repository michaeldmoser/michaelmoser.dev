import type { UserConfig } from '@11ty/eleventy'
import { tsxExtension } from './lib/tsx.ts'

export default function (eleventyConfig: UserConfig) {
  eleventyConfig.addTemplateFormats('11ty.tsx')
  eleventyConfig.addExtension('11ty.tsx', tsxExtension)
  return {
    markdownTemplateEngine: false,
    dir: { input: 'src', output: '_site' }
  }
}
