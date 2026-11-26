import { readFileSync } from 'node:fs'
import syntaxHighlight from '@11ty/eleventy-plugin-syntaxhighlight'
import { html } from 'jsx-async-runtime'
import { calloutLabel } from '#lib/callouts.ts'
import { declaredTokenValues } from '#lib/stylesheet.ts'

const css = readFileSync(new URL('../css/site.css', import.meta.url), 'utf8')

const declaredValues = declaredTokenValues(css)

function tokensOf(family: 'font-size' | 'space') {
  return [...declaredValues]
    .filter(([name]) => name.startsWith(`--${family}-`))
    .map(([name, value]) => ({ name, value }))
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

const highlightedCode = syntaxHighlight.pairedShortcode(
  codeSample,
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
      {html(highlightedCode)}
      <h2>Callout</h2>
      <aside class='callout callout-note'>
        <p class='callout-label'>{calloutLabel('note')}</p>
        <p>A note callout.</p>
      </aside>
    </div>
  )
}
