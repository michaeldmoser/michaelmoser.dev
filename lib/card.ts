import { Resvg } from '@resvg/resvg-js'
import satori from 'satori'

import { resolveColors } from './stylesheet.ts'

export const cardSize = { width: 1200, height: 630 }

export type CardPalette = { background: string; text: string; accent: string }

export function cardPalette(css: string): CardPalette {
  const colors = resolveColors(css, { os: 'dark', theme: 'dark' })
  return {
    background: colors['--color-bg'],
    text: colors['--color-text'],
    accent: colors['--palette-dark-amber']
  }
}

export type CardFonts = { regular: Buffer; bold: Buffer }

export type SatoriChild = SatoriNode | string | number

export interface SatoriNode {
  type: string
  props: {
    style?: Record<string, unknown>
    children?: SatoriChild | SatoriChild[]
  }
}

interface JsxElement {
  tag: string | ((props: Record<string, unknown>) => unknown)
  props: Record<string, unknown>
}

function isJsxElement(value: unknown): value is JsxElement {
  return (
    typeof value === 'object' &&
    value !== null &&
    'tag' in value &&
    'props' in value
  )
}

function convertChildren(children: unknown): SatoriChild[] {
  if (Array.isArray(children)) return children.flatMap(convertChildren)
  if (
    children === null ||
    children === undefined ||
    typeof children === 'boolean'
  )
    return []
  if (typeof children === 'string' || typeof children === 'number')
    return [children]
  return [toSatoriNode(children)]
}

function camelCase(property: string): string {
  return property.replace(/-([a-z])/g, (_, letter: string) =>
    letter.toUpperCase()
  )
}

function parseStyle(style: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const declaration of style.split(';')) {
    const separator = declaration.indexOf(':')
    if (separator === -1) continue
    const property = declaration.slice(0, separator).trim()
    const value = declaration.slice(separator + 1).trim()
    if (property === '' || value === '') continue
    result[camelCase(property)] = value
  }
  return result
}

export function toSatoriNode(element: unknown): SatoriNode {
  if (!isJsxElement(element)) {
    throw new TypeError('toSatoriNode expects a JSX element')
  }
  if (typeof element.tag === 'function') {
    return toSatoriNode(element.tag(element.props))
  }

  const { style, children } = element.props
  const converted = convertChildren(children)
  const props: SatoriNode['props'] = {}
  if (style !== undefined) props.style = parseStyle(String(style))
  if (converted.length === 1) props.children = converted[0]
  else if (converted.length > 1) props.children = converted
  return { type: element.tag, props }
}

export async function renderCard(
  element: unknown,
  fonts: CardFonts
): Promise<Buffer> {
  const svg = await satori(
    toSatoriNode(element) as unknown as Parameters<typeof satori>[0],
    {
      ...cardSize,
      fonts: [
        { name: 'Inter', data: fonts.regular, weight: 400, style: 'normal' },
        { name: 'Inter', data: fonts.bold, weight: 700, style: 'normal' }
      ]
    }
  )
  return new Resvg(svg).render().asPng()
}
