import { beforeAll, describe, expect, it } from 'vitest'
import { buildScenario } from './scenario.ts'

const languages = [
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
]

let outcome: Awaited<ReturnType<typeof buildScenario>>
let html = ''

beforeAll(async () => {
  outcome = await buildScenario('code-blocks')
  html =
    outcome.results?.find((result) => result.url === '/writing/snippets/')
      ?.content ?? ''
}, 60_000)

function preBlock(language: string) {
  const match = html.match(
    new RegExp(
      `<pre[^>]*class="[^"]*\\blanguage-${language}\\b[^"]*"[^>]*>[\\s\\S]*?</pre>`
    )
  )
  return match?.[0] ?? ''
}

describe('code blocks', () => {
  it('builds without error', () => {
    expect(outcome.error).toBeUndefined()
    expect(html).not.toBe('')
  })

  it.each(languages)(
    'highlights a %s fence with build-time token markup',
    (language) => {
      expect(preBlock(language)).toMatch(/<span class="token [^"]+"/)
    }
  )

  it('ships no highlighting library as a page script', () => {
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
    const joined = scripts.map((script) => script[1] + script[2]).join('\n')
    expect(joined).not.toMatch(/prism|highlight/i)
  })

  it('renders a fence with no language as a plain pre and code', () => {
    expect(html).toMatch(/<pre><code>unlabeled fence content/)
  })

  it('renders a fence with an unlisted language as a plain pre and code', () => {
    expect(html).toMatch(/<pre><code>mystery fence content/)
  })
})
