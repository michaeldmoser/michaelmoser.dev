import { readFileSync } from 'node:fs'
import { html } from 'jsx-async-runtime'
import postcss from 'postcss'
import Prism from 'prismjs'
import { calloutLabel } from '#lib/callouts.ts'
import { declaredTokens } from '#lib/stylesheet.ts'

const css = readFileSync(new URL('../css/site.css', import.meta.url), 'utf8')

const declaredValues = new Map<string, string>()
postcss.parse(css).walkDecls(/^--/, (decl) => {
  if (!declaredValues.has(decl.prop)) declaredValues.set(decl.prop, decl.value)
})

function tokensOf(family: 'font-size' | 'space') {
  return declaredTokens(css)
    .filter((name) => name.startsWith(`--${family}-`))
    .map((name) => ({ name, value: declaredValues.get(name) ?? '' }))
}

const fontSizes = tokensOf('font-size')
const spaces = tokensOf('space')

export const specimenCss = [
  ...fontSizes.map(
    ({ name }) => `[data-font-size='${name}'] { font-size: var(${name}); }`
  ),
  ...spaces.map(
    ({ name }) =>
      `[data-space='${name}'] { display: inline-block; inline-size: var(${name}); block-size: var(${name}); background: currentcolor; }`
  )
].join('\n')

const codeSample = `// greet someone
function greet(name) {
  const count = 42
  return "Hello, " + name + count
}`

const highlightedCode = Prism.highlight(
  codeSample,
  Prism.languages.javascript,
  'javascript'
)

export function Specimens() {
  return (
    <div class='prose'>
      <h2>Font sizes</h2>
      {fontSizes.map(({ name, value }) => (
        <p data-font-size={name}>
          {name}: {value}
        </p>
      ))}
      <h2>Spacing</h2>
      {spaces.map(({ name, value }) => (
        <p>
          <span data-space={name}></span> {name}: {value}
        </p>
      ))}
      <h2 id='controls'>Controls</h2>
      <p>
        <a href='#controls'>Jump back to the controls heading</a>
      </p>
      <p>
        <button type='button'>A button</button>
      </p>
      <h2>Code</h2>
      <pre>
        <code>{html(highlightedCode)}</code>
      </pre>
      <h2>Callout</h2>
      <aside class='callout callout-note'>
        <p class='callout-label'>{calloutLabel('note')}</p>
        <p>A note callout.</p>
      </aside>
    </div>
  )
}
