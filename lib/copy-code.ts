export interface CodeButton {
  textContent: string | null
  setAttribute(name: string, value: string): void
  addEventListener(type: 'click', handler: () => void): void
}

export interface CodeBlock {
  querySelector(selector: 'code'): { textContent: string | null } | null
  append(button: CodeButton): void
}

export interface CodeRoot {
  querySelectorAll(selector: 'pre'): ArrayLike<CodeBlock>
  createElement(tag: 'button'): CodeButton
}

export interface CodeClipboard {
  writeText(text: string): Promise<void>
}

const resetDelayMs = 2000

export function enhanceCodeBlocks(
  root: CodeRoot,
  clipboard: CodeClipboard,
  schedule: (fn: () => void, ms: number) => void = setTimeout
): void {
  for (const block of Array.from(root.querySelectorAll('pre'))) {
    const button = root.createElement('button')
    button.setAttribute('type', 'button')
    button.textContent = 'Copy'
    button.addEventListener('click', async () => {
      const code = (block.querySelector('code')?.textContent ?? '').replace(
        /\n$/,
        ''
      )
      try {
        await clipboard.writeText(code)
        button.textContent = 'Copied'
        schedule(() => {
          button.textContent = 'Copy'
        }, resetDelayMs)
      } catch {
        button.textContent = 'Copy failed'
      }
    })
    block.append(button)
  }
}
