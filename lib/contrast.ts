import { type ColorContext, resolveColors } from './stylesheet.ts'

export type ContrastContext = 'light' | 'dark' | 'print'

export interface ContrastRow {
  context: ContrastContext
  foreground: string
  background: string
  foregroundHex: string
  backgroundHex: string
  ratio: number
  threshold: number
  pass: boolean
}

const CONTEXTS: Record<ContrastContext, ColorContext> = {
  light: { os: 'light' },
  dark: { os: 'dark' },
  print: { os: 'light', print: true }
}

const TEXT = 4.5
const NON_TEXT = 3
const PRINT_TEXT = 7

const PAIRS: [foreground: string, background: string, threshold: number][] = [
  ['--color-text', '--color-surface', TEXT],
  ['--color-link', '--color-surface', TEXT],
  ...['keyword', 'string', 'comment', 'number', 'function', 'punctuation'].map(
    (kind): [string, string, number] => [
      `--color-code-${kind}`,
      '--color-code-surface',
      TEXT
    ]
  ),
  ['--color-callout-label', '--color-callout-surface', TEXT],
  ['--color-focus', '--color-surface', NON_TEXT],
  ['--color-border', '--color-surface', NON_TEXT]
]

function linearize(channel: number): number {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) =>
    linearize(Number.parseInt(hex.slice(i, i + 2), 16))
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground)
  const b = relativeLuminance(background)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

export function contrastReport(css: string): ContrastRow[] {
  const rows: ContrastRow[] = []
  for (const [context, colorContext] of Object.entries(CONTEXTS) as [
    ContrastContext,
    ColorContext
  ][]) {
    const colors = resolveColors(css, colorContext)
    for (const [foreground, background, base] of PAIRS) {
      const foregroundHex = colors[foreground]
      const backgroundHex = colors[background]
      if (foregroundHex === undefined) {
        throw new Error(`${foreground} does not resolve in ${context} context`)
      }
      if (backgroundHex === undefined) {
        throw new Error(`${background} does not resolve in ${context} context`)
      }
      const threshold =
        context === 'print' && foreground === '--color-text' ? PRINT_TEXT : base
      const ratio = contrastRatio(foregroundHex, backgroundHex)
      rows.push({
        context,
        foreground,
        background,
        foregroundHex,
        backgroundHex,
        ratio,
        threshold,
        pass: ratio >= threshold
      })
    }
  }
  return rows
}
