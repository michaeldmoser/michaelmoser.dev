import postcss, {
  type AtRule,
  type Declaration,
  type Root,
  type Rule
} from 'postcss'

export interface RawValue {
  selector: string
  property: string
  value: string
}

const NAMED_COLORS = new Set(
  `aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen`.split(
    ' '
  )
)

const COLOR_FUNCTIONS = new Set([
  'rgb',
  'rgba',
  'hsl',
  'hsla',
  'hwb',
  'lab',
  'lch',
  'oklab',
  'oklch',
  'color',
  'color-mix',
  'light-dark'
])

const SPACING = /^(margin|padding)(-|$)|^(gap|row-gap|column-gap)$/
const WIDTH = /^(width|min-width|max-width|inline-size|max-inline-size)$/
const HEX_COLOR = /^#[0-9a-f]{3,8}$/i

function splitComponents(value: string): string[] {
  const parts: string[] = []
  let current = ''
  let depth = 0
  for (const char of value) {
    if (char === '(') depth++
    if (char === ')') depth--
    if (depth === 0 && (char === ' ' || char === ',' || char === '\n')) {
      if (current) parts.push(current)
      current = ''
    } else {
      current += char
    }
  }
  if (current) parts.push(current)
  return parts
}

function isVar(component: string): boolean {
  return component.startsWith('var(')
}

function isRawColor(component: string): boolean {
  if (HEX_COLOR.test(component)) return true
  const fn = component.match(/^([a-z-]+)\(/i)
  if (fn) return COLOR_FUNCTIONS.has(fn[1].toLowerCase())
  return NAMED_COLORS.has(component.toLowerCase())
}

function isRawMeasure(component: string): boolean {
  return !isVar(component) && component !== '0' && component !== 'inherit'
}

function isRawFontShorthandSize(component: string): boolean {
  return !isVar(component) && /^[\d.]/.test(component)
}

function isRaw(property: string, value: string): boolean {
  const components = splitComponents(value)
  if (components.some(isRawColor)) return true
  if (
    property === 'font-size' ||
    SPACING.test(property) ||
    WIDTH.test(property)
  ) {
    return components.some(isRawMeasure)
  }
  if (property === 'font') return components.some(isRawFontShorthandSize)
  return false
}

function isTokenBlock(rule: Rule): boolean {
  const scopedToRoot = rule.selectors.every((s) => s.trim().startsWith(':root'))
  if (!scopedToRoot) return false
  return (rule.nodes ?? []).every(
    (node) =>
      node.type !== 'decl' ||
      node.prop.startsWith('--') ||
      node.prop === 'color-scheme'
  )
}

export interface ColorContext {
  os: 'light' | 'dark'
  theme?: 'light' | 'dark'
  print?: boolean
}

interface Cascaded {
  value: string
  specificity: number
  order: number
}

const THEME_ATTRIBUTE = /\[data-theme(?:=["']?([^"'\]]+)["']?)?\]/g
const NEGATED_THEME_ATTRIBUTE =
  /:not\((\[data-theme(?:=["']?[^"'\]]+["']?)?\])\)/g

function themeAttributeMatches(
  attribute: RegExpMatchArray,
  theme: string | undefined
): boolean {
  const expected = attribute[1]
  return expected === undefined ? theme !== undefined : theme === expected
}

function selectorMatches(selector: string, theme: string | undefined): boolean {
  const negated = [...selector.matchAll(NEGATED_THEME_ATTRIBUTE)]
  const positive = selector.replace(NEGATED_THEME_ATTRIBUTE, '')
  return (
    negated.every(
      (n) =>
        !themeAttributeMatches([...n[1].matchAll(THEME_ATTRIBUTE)][0], theme)
    ) &&
    [...positive.matchAll(THEME_ATTRIBUTE)].every((a) =>
      themeAttributeMatches(a, theme)
    )
  )
}

function selectorSpecificity(selector: string): number {
  return 1 + (selector.match(/\[/g) ?? []).length
}

function isPrintBlock(rule: Rule): boolean {
  const parent = rule.parent
  return (
    parent?.type === 'atrule' && (parent as AtRule).params.trim() === 'print'
  )
}

function isActive(rule: Rule, context: ColorContext): boolean {
  const parent = rule.parent
  if (parent?.type === 'root') return true
  return isPrintBlock(rule) && context.print === true
}

function tokenBlocks(root: Root): Rule[] {
  const blocks: Rule[] = []
  root.walkRules((rule) => {
    if (isTokenBlock(rule)) blocks.push(rule)
  })
  return blocks
}

function cascade(root: Root, context: ColorContext): Map<string, Cascaded> {
  const winners = new Map<string, Cascaded>()
  let order = 0
  for (const rule of tokenBlocks(root)) {
    const matching = rule.selectors
      .map((s) => s.trim())
      .filter((s) => selectorMatches(s, context.theme))
    const active = isActive(rule, context) && matching.length > 0
    const specificity = Math.max(0, ...matching.map(selectorSpecificity))
    rule.each((node) => {
      if (node.type !== 'decl') return
      order++
      if (!active) return
      const current = winners.get(node.prop)
      if (
        !current ||
        specificity > current.specificity ||
        (specificity === current.specificity && order > current.order)
      ) {
        winners.set(node.prop, { value: node.value, specificity, order })
      }
    })
  }
  return winners
}

function activeScheme(
  winners: Map<string, Cascaded>,
  os: 'light' | 'dark'
): 'light' | 'dark' {
  const words = (winners.get('color-scheme')?.value ?? '').split(/\s+/)
  const light = words.includes('light')
  const dark = words.includes('dark')
  if (light && dark) return os
  return dark ? 'dark' : 'light'
}

function substituteVars(
  value: string,
  winners: Map<string, Cascaded>,
  seen: string[] = []
): string | null {
  let failed = false
  const result = value.replace(
    /var\(\s*(--[\w-]+)\s*\)/g,
    (_, name: string) => {
      const target = winners.get(name)
      if (!target || seen.includes(name)) {
        failed = true
        return ''
      }
      const inner = substituteVars(target.value, winners, [...seen, name])
      if (inner === null) failed = true
      return inner ?? ''
    }
  )
  return failed ? null : result
}

function pickLightDark(value: string, scheme: 'light' | 'dark'): string {
  const pattern = /light-dark\(\s*([^,()]+?)\s*,\s*([^,()]+?)\s*\)/
  let result = value
  while (pattern.test(result)) {
    result = result.replace(pattern, (_, light: string, dark: string) =>
      scheme === 'dark' ? dark : light
    )
  }
  return result.trim()
}

export function resolveColors(
  css: string,
  context: ColorContext
): Record<string, string> {
  const winners = cascade(postcss.parse(css), context)
  const scheme = activeScheme(winners, context.os)
  const colors: Record<string, string> = {}
  for (const [name, { value }] of winners) {
    if (!name.startsWith('--')) continue
    const substituted = substituteVars(value, winners, [name])
    if (substituted === null) continue
    const resolved = pickLightDark(substituted, scheme)
    if (HEX_COLOR.test(resolved)) colors[name] = resolved
  }
  return colors
}

export function declaredTokens(css: string): string[] {
  const names = new Set<string>()
  for (const rule of tokenBlocks(postcss.parse(css))) {
    rule.walkDecls((decl) => {
      if (decl.prop.startsWith('--')) names.add(decl.prop)
    })
  }
  return [...names]
}

export function findRawValues(css: string): RawValue[] {
  const found: RawValue[] = []
  postcss.parse(css).walkDecls((decl: Declaration) => {
    const rule = decl.parent
    if (rule?.type !== 'rule') return
    if (decl.prop.startsWith('--')) return
    if (isTokenBlock(rule as Rule)) return
    if (isRaw(decl.prop.toLowerCase(), decl.value)) {
      found.push({
        selector: (rule as Rule).selector,
        property: decl.prop,
        value: decl.value
      })
    }
  })
  return found
}
