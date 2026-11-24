import type { Problem } from './site-check.ts'

export const SITE_CSS_PATH = 'assets/css/site.css'

type Page = { file: string; html: string }

function classesUsed(html: string): string[] {
  return [...html.matchAll(/\sclass\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].flatMap(
    (match) => (match[1] ?? match[2]).split(/\s+/).filter((name) => name !== '')
  )
}

function isArbitraryValue(className: string): boolean {
  return className.includes('[')
}

function classesDefined(css: string): Set<string> {
  const selectors = [
    ...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{};]*)\{/g)
  ]
    .map((match) => match[1].trim())
    .filter((prelude) => !prelude.startsWith('@'))
  return new Set(
    selectors.flatMap((selector) =>
      [...selector.matchAll(/\.((?:\\.|[\w-])+)/g)].map((match) =>
        match[1].replace(/\\(.)/g, '$1')
      )
    )
  )
}

function problemMessage(
  className: string,
  defined: Set<string>
): string | null {
  if (isArbitraryValue(className)) {
    return `arbitrary-value class ${className}`
  }
  return defined.has(className)
    ? null
    : `class ${className} is neither a utility nor a component in the built CSS`
}

export function classProblems(pages: Page[], css: string): Problem[] {
  const defined = classesDefined(css)
  return pages.flatMap((page) =>
    [...new Set(classesUsed(page.html))].flatMap((className) => {
      const message = problemMessage(className, defined)
      return message === null ? [] : [{ file: page.file, message }]
    })
  )
}
