import { isCi, type RunContext } from './posts.ts'

export type DevOnlyPolicy = 'render' | 'exclude'

export function devOnlyPolicy(context: RunContext): DevOnlyPolicy {
  if (isCi(context.env)) return 'exclude'
  return context.runMode === 'serve' ? 'render' : 'exclude'
}
