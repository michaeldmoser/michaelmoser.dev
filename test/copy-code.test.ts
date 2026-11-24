import { describe, expect, it } from 'vitest'
import {
  type CodeClipboard,
  type CodeRoot,
  enhanceCodeBlocks
} from '../lib/copy-code.ts'

function fakeRoot(codeText: string) {
  const buttons: FakeNode[] = []
  const { root: base } = fakeDocument(codeText)
  const root = {
    querySelectorAll: base.querySelectorAll,
    createElement: (tag: 'button' | 'div') => {
      const node = base.createElement(tag as 'button') as unknown as FakeNode
      if (tag === 'button') buttons.push(node)
      return node
    }
  } as unknown as CodeRoot
  return { root, buttons }
}

function fakeClipboard(outcome: 'resolve' | 'reject' = 'resolve') {
  const written: string[] = []
  const clipboard: CodeClipboard = {
    writeText: async (text) => {
      written.push(text)
      if (outcome === 'reject') throw new Error('denied')
    }
  }
  return { clipboard, written }
}

function fakeSchedule() {
  const pending: Array<{ fn: () => void; ms: number }> = []
  return {
    schedule: (fn: () => void, ms: number) => {
      pending.push({ fn, ms })
    },
    pending
  }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

class FakeNode {
  parent: FakeNode | null = null
  children: FakeNode[] = []
  className = ''
  textContent: string | null = null
  private listener: (() => void) | undefined

  constructor(readonly tag: string) {}

  get parentNode() {
    return this.parent
  }

  get classList() {
    return {
      add: (...names: string[]) => {
        this.className = [this.className, ...names].filter(Boolean).join(' ')
      }
    }
  }

  setAttribute() {}

  addEventListener(_type: 'click', handler: () => void) {
    this.listener = handler
  }

  click() {
    this.listener?.()
  }

  detach() {
    if (!this.parent) return
    this.parent.children = this.parent.children.filter((c) => c !== this)
    this.parent = null
  }

  append(...nodes: FakeNode[]) {
    for (const node of nodes) {
      node.detach()
      node.parent = this
      this.children.push(node)
    }
  }

  insertBefore(node: FakeNode, reference: FakeNode | null) {
    node.detach()
    node.parent = this
    const index = reference ? this.children.indexOf(reference) : -1
    if (index < 0) this.children.push(node)
    else this.children.splice(index, 0, node)
    return node
  }

  before(...nodes: FakeNode[]) {
    for (const node of nodes) this.parent?.insertBefore(node, this)
  }

  after(...nodes: FakeNode[]) {
    const parent = this.parent
    if (!parent) return
    let reference = parent.children[parent.children.indexOf(this) + 1] ?? null
    for (const node of nodes) {
      parent.insertBefore(node, reference)
      reference = parent.children[parent.children.indexOf(node) + 1] ?? null
    }
  }

  replaceWith(node: FakeNode) {
    const parent = this.parent
    if (!parent) return
    parent.insertBefore(node, this)
    this.detach()
  }

  contains(node: FakeNode): boolean {
    return node === this || this.children.some((child) => child.contains(node))
  }

  querySelector(selector: string): FakeNode | null {
    for (const child of this.children) {
      if (child.tag === selector) return child
      const found = child.querySelector(selector)
      if (found) return found
    }
    return null
  }
}

function fakeDocument(codeText: string) {
  const container = new FakeNode('main')
  const pre = new FakeNode('pre')
  const code = new FakeNode('code')
  code.textContent = codeText
  pre.append(code)
  container.append(pre)
  const root = {
    querySelectorAll: () => [pre],
    createElement: (tag: string) => new FakeNode(tag)
  } as unknown as CodeRoot
  return { root, container, pre }
}

describe('copy code button placement', () => {
  it('places the button in a non-scrolling wrapper around the pre, outside the pre', () => {
    const { root, container, pre } = fakeDocument('npm test\n')
    const { clipboard } = fakeClipboard()

    enhanceCodeBlocks(root, clipboard, fakeSchedule().schedule)

    const wrapper = container.children[0]
    expect(wrapper).not.toBe(pre)
    expect(wrapper.className.split(/\s+/)).toContain('code-block')
    expect(wrapper.children).toContain(pre)
    const button = wrapper.children.find((child) => child.tag === 'button')
    expect(button).toBeDefined()
    expect(button?.textContent).toBe('Copy')
    expect(pre.contains(button as FakeNode)).toBe(false)
    expect(container.children).toHaveLength(1)
  })

  it('still copies exactly the code text when the button sits in the wrapper', async () => {
    const { root, container } = fakeDocument('npm test\n')
    const { clipboard, written } = fakeClipboard()
    enhanceCodeBlocks(root, clipboard, fakeSchedule().schedule)

    const button = container.children[0].children.find(
      (child) => child.tag === 'button'
    )
    button?.click()
    await settle()

    expect(written).toEqual(['npm test'])
  })
})

describe('copy code buttons', () => {
  it('adds one button per code block labelled Copy', () => {
    const { root, buttons } = fakeRoot('npm test\n')
    const { clipboard } = fakeClipboard()

    enhanceCodeBlocks(root, clipboard, fakeSchedule().schedule)

    expect(buttons.map((button) => button.textContent)).toEqual(['Copy'])
  })

  it('writes the code text without a trailing newline to the clipboard on click', async () => {
    const { root, buttons } = fakeRoot('npm test\n')
    const { clipboard, written } = fakeClipboard()
    enhanceCodeBlocks(root, clipboard, fakeSchedule().schedule)

    buttons[0].click()
    await settle()

    expect(written).toEqual(['npm test'])
  })

  it('reads Copied after a click and reverts to Copy after 2 seconds', async () => {
    const { root, buttons } = fakeRoot('npm test\n')
    const { clipboard } = fakeClipboard()
    const { schedule, pending } = fakeSchedule()
    enhanceCodeBlocks(root, clipboard, schedule)

    buttons[0].click()
    await settle()

    expect(buttons[0].textContent).toBe('Copied')
    expect(pending.map((entry) => entry.ms)).toEqual([2000])

    pending[0].fn()

    expect(buttons[0].textContent).toBe('Copy')
  })

  it('reads Copy failed when the clipboard rejects', async () => {
    const { root, buttons } = fakeRoot('npm test\n')
    const { clipboard } = fakeClipboard('reject')
    enhanceCodeBlocks(root, clipboard, fakeSchedule().schedule)

    buttons[0].click()
    await settle()

    expect(buttons[0].textContent).toBe('Copy failed')
  })
})
