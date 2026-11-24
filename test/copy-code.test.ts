import { describe, expect, it } from 'vitest'
import {
  type CodeClipboard,
  type CodeRoot,
  enhanceCodeBlocks
} from '../lib/copy-code.ts'

interface FakeButton {
  textContent: string | null
  setAttribute(name: string, value: string): void
  addEventListener(type: 'click', handler: () => void): void
  click(): void
}

function fakeButton(): FakeButton {
  let listener: (() => void) | undefined
  return {
    textContent: null,
    setAttribute: () => {},
    addEventListener: (_type, handler) => {
      listener = handler
    },
    click: () => listener?.()
  }
}

function fakeRoot(codeText: string) {
  const buttons: FakeButton[] = []
  const block = {
    querySelector: () => ({ textContent: codeText }),
    append: (button: FakeButton) => {
      buttons.push(button)
    }
  }
  const root = {
    querySelectorAll: () => [block],
    createElement: () => fakeButton()
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
