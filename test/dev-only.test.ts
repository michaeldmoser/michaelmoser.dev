import { describe, expect, it } from 'vitest'
import { devOnlyPolicy } from '../lib/dev-only.ts'

describe('devOnlyPolicy', () => {
  it('renders dev-only pages under serve without CI', () => {
    expect(devOnlyPolicy({ runMode: 'serve', env: {} })).toBe('render')
  })

  it.each(['build', 'watch'] as const)(
    'excludes dev-only pages under %s without CI',
    (runMode) => {
      expect(devOnlyPolicy({ runMode, env: {} })).toBe('exclude')
    }
  )

  it.each(['build', 'watch', 'serve'] as const)(
    'excludes dev-only pages under %s when CI is set',
    (runMode) => {
      expect(devOnlyPolicy({ runMode, env: { CI: 'true' } })).toBe('exclude')
    }
  )

  it.each(['build', 'watch', 'serve'] as const)(
    'excludes dev-only pages under %s when WORKERS_CI is set',
    (runMode) => {
      expect(devOnlyPolicy({ runMode, env: { WORKERS_CI: '1' } })).toBe(
        'exclude'
      )
    }
  )

  it('does not treat empty CI variables as CI', () => {
    expect(
      devOnlyPolicy({ runMode: 'serve', env: { CI: '', WORKERS_CI: '' } })
    ).toBe('render')
  })
})
