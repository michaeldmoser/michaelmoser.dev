export const CALLOUT_TYPES = ['note', 'tip', 'warning', 'tradeoff'] as const

export type CalloutType = (typeof CALLOUT_TYPES)[number]

const LABELS: Record<CalloutType, string> = {
  note: 'Note',
  tip: 'Tip',
  warning: 'Warning',
  tradeoff: 'Trade-off'
}

function isCalloutType(type: string): type is CalloutType {
  return (CALLOUT_TYPES as readonly string[]).includes(type)
}

export function calloutLabel(type: CalloutType): string {
  return LABELS[type]
}

export function parseCalloutType(info: string, inputPath: string): CalloutType {
  const type = info.trim()
  if (!isCalloutType(type)) {
    throw new Error(`${inputPath}: unknown callout type "${type}"`)
  }
  return type
}
