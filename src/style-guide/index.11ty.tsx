import { readFileSync } from 'node:fs'
import { contrastReport } from '#lib/contrast.ts'
import {
  declaredTokens,
  declaredTokenValues,
  resolveColors
} from '#lib/stylesheet.ts'

const css = readFileSync(
  new URL('../_includes/css/site.css', import.meta.url),
  'utf8'
)

const contexts = {
  light: { os: 'light' },
  dark: { os: 'dark' },
  print: { os: 'light', print: true }
} as const

const tokens = declaredTokens(css)
const semantics = tokens.filter((name) => name.startsWith('--color-'))
const primitives = tokens.filter((name) => name.startsWith('--palette-'))
const declaredValues = declaredTokenValues(css)
const resolved = {
  light: resolveColors(css, contexts.light),
  dark: resolveColors(css, contexts.dark),
  print: resolveColors(css, contexts.print)
}
const report = contrastReport(css)

const swatchCss = [
  '[data-swatch] { display: inline-block; inline-size: 1.5em; block-size: 1.5em; vertical-align: middle; }',
  ...semantics.flatMap((name) =>
    Object.entries(resolved).map(
      ([context, colors]) =>
        `[data-swatch='${name}'][data-context='${context}'] { background: ${colors[name]}; }`
    )
  ),
  ...primitives.map(
    (name) =>
      `[data-swatch='${name}'] { background: ${declaredValues.get(name)}; }`
  )
].join('\n')

export default class StyleGuide {
  data() {
    return {
      layout: 'layouts/base.11ty.tsx',
      title: 'Style guide',
      noindex: true,
      eleventyExcludeFromCollections: true,
      headStyle: swatchCss,
      permalink: (data: { devServer: boolean }) =>
        data.devServer ? '/style-guide/' : false
    }
  }

  render() {
    return (
      <>
        <h1>Style guide</h1>
        <h2>Semantic colours</h2>
        <table>
          <thead>
            <tr>
              <th>Token</th>
              <th>Light</th>
              <th>Dark</th>
              <th>Print</th>
            </tr>
          </thead>
          <tbody>
            {semantics.map((name) => (
              <tr>
                <td>{name}</td>
                {Object.entries(resolved).map(([context, colors]) => (
                  <td>
                    <span data-swatch={name} data-context={context}></span>{' '}
                    {colors[name]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <h2>Palette</h2>
        <table>
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {primitives.map((name) => (
              <tr>
                <td>{name}</td>
                <td>
                  <span data-swatch={name}></span> {declaredValues.get(name)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <h2>Contrast</h2>
        <table>
          <thead>
            <tr>
              <th>Context</th>
              <th>Foreground</th>
              <th>Background</th>
              <th>Ratio</th>
              <th>Threshold</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {report.map((row) => (
              <tr>
                <td>{row.context}</td>
                <td>{row.foreground}</td>
                <td>{row.background}</td>
                <td>{row.ratio.toFixed(2)}</td>
                <td>{row.threshold}</td>
                <td>{row.pass ? 'pass' : 'fail'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <iframe src='/style-guide/light/' title='Light theme'></iframe>
        <iframe src='/style-guide/dark/' title='Dark theme'></iframe>
      </>
    )
  }
}
