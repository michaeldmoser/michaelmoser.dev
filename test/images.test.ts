import { describe, expect, it } from 'vitest'
import { buildScenario } from './scenario.ts'

function failureText(error: Error | undefined) {
  const parts: string[] = []
  let current: unknown = error
  while (current instanceof Error) {
    parts.push(current.message)
    current =
      (current as Error & { originalError?: unknown }).originalError ??
      current.cause
  }
  return parts.join('\n')
}

describe('image alt text failures', () => {
  it.each([
    ['image-missing-alt', 'shot-post/index.md', 'shot.png'],
    ['image-whitespace-alt', 'blank-post/index.md', 'shot.png'],
    ['image-svg-missing-alt', 'diagram-post/index.md', 'flow.svg'],
    [
      'image-remote-missing-alt',
      'remote-post/index.md',
      'https://example.com/pictures/remote.png'
    ]
  ])(
    'fails the build naming the post and the src when %s has no alt text',
    async (scenario, post, src) => {
      const outcome = await buildScenario(scenario)

      expect(outcome.error).toBeDefined()
      const text = failureText(outcome.error)
      expect(text).toContain(post)
      expect(text).toContain(`image "${src}" has no alt text`)
    },
    60_000
  )
})
