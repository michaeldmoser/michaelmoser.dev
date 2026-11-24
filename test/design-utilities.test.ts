import { beforeAll, describe, expect, it } from 'vitest'
import { buildScenario } from './scenario'

let utilities: string

beforeAll(async () => {
  const outcome = await buildScenario('design-utilities')
  if (outcome.error) throw outcome.error
  utilities =
    outcome.results?.find((result) => result.url === '/assets/css/site.css')
      ?.content ?? ''
  if (!utilities) throw new Error('site.css was not built')
}, 60_000)

function declarationsOf(className: string) {
  const match = utilities.match(new RegExp(`\\.${className}\\s*\\{([^}]*)\\}`))
  return (match?.[1] ?? '')
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
}

describe('generated color utilities', () => {
  it.each([
    ['text-text', 'color', 'text'],
    ['text-link', 'color', 'link'],
    ['text-accent', 'color', 'accent'],
    ['bg-surface', 'background-color', 'surface'],
    ['border-border', 'border-color', 'border'],
    ['outline-focus', 'outline-color', 'focus']
  ])('utility %s references the semantic color role', (className, property, role) => {
    expect(declarationsOf(className)).toEqual([
      `${property}: var(--color-${role})`
    ])
  })

  it('generates no utility from a palette primitive', () => {
    const generated = [
      'text-palette-ink',
      'bg-palette-dark-paper',
      'text-blue-500'
    ].filter((className) => utilities.includes(`.${className}`))
    expect(generated).toEqual([])
  })
})
