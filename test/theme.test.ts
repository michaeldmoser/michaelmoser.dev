import { describe, expect, it } from 'vitest'
import {
  applyStoredTheme,
  initThemeToggle,
  nextChoice,
  readStoredTheme,
  THEME_STORAGE_KEY,
  type ThemeButton,
  type ThemeRoot,
  type ThemeStorage
} from '../lib/theme.ts'

function fakeRoot(): ThemeRoot {
  const attributes = new Map<string, string>()
  return {
    getAttribute: (name) => attributes.get(name) ?? null,
    setAttribute: (name, value) => {
      attributes.set(name, value)
    },
    removeAttribute: (name) => {
      attributes.delete(name)
    }
  }
}

function fakeStorage(initial: Record<string, string> = {}): ThemeStorage {
  const items = new Map<string, string>(Object.entries(initial))
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value)
    },
    removeItem: (key) => {
      items.delete(key)
    }
  }
}

function throwingStorage(): ThemeStorage {
  return {
    getItem: () => {
      throw new Error('blocked')
    },
    setItem: () => {
      throw new Error('blocked')
    },
    removeItem: () => {
      throw new Error('blocked')
    }
  }
}

function blockedAccess(): ThemeStorage {
  throw new Error('blocked')
}

function fakeButton() {
  const attributes = new Map<string, string>()
  let listener: (() => void) | undefined
  const button: ThemeButton & {
    click(): void
    attr(name: string): string | undefined
  } = {
    hidden: true,
    textContent: null,
    setAttribute: (name, value) => {
      attributes.set(name, value)
    },
    addEventListener: (_type, handler) => {
      listener = handler
    },
    click: () => listener?.(),
    attr: (name) => attributes.get(name)
  }
  return button
}

describe('theme toggle', () => {
  it('cycles light to dark to system to light', () => {
    expect(nextChoice('light')).toBe('dark')
    expect(nextChoice('dark')).toBe('system')
    expect(nextChoice('system')).toBe('light')
  })

  it('unhides the button labelled System when nothing is stored', () => {
    const button = fakeButton()

    initThemeToggle(button, fakeRoot(), () => fakeStorage())

    expect(button.hidden).toBe(false)
    expect(button.textContent).toBe('System')
    expect(button.attr('aria-label')).toBe('Theme: system. Change theme')
  })

  it.each([
    ['light', 'Light', 'Theme: light. Change theme'],
    ['dark', 'Dark', 'Theme: dark. Change theme']
  ])('labels the button for a stored %s theme', (stored, label, name) => {
    const button = fakeButton()

    initThemeToggle(button, fakeRoot(), () =>
      fakeStorage({ [THEME_STORAGE_KEY]: stored })
    )

    expect(button.hidden).toBe(false)
    expect(button.textContent).toBe(label)
    expect(button.attr('aria-label')).toBe(name)
  })

  it('cycles theme, label, accessible name and storage on each click', () => {
    const button = fakeButton()
    const root = fakeRoot()
    const storage = fakeStorage()
    initThemeToggle(button, root, () => storage)

    const observed = []
    for (let i = 0; i < 4; i++) {
      button.click()
      observed.push([
        root.getAttribute('data-theme'),
        button.textContent,
        button.attr('aria-label'),
        storage.getItem(THEME_STORAGE_KEY)
      ])
    }

    expect(observed).toEqual([
      ['light', 'Light', 'Theme: light. Change theme', 'light'],
      ['dark', 'Dark', 'Theme: dark. Change theme', 'dark'],
      [null, 'System', 'Theme: system. Change theme', null],
      ['light', 'Light', 'Theme: light. Change theme', 'light']
    ])
  })

  it('continues the cycle from the stored theme', () => {
    const button = fakeButton()
    const root = fakeRoot()
    const storage = fakeStorage({ [THEME_STORAGE_KEY]: 'dark' })
    initThemeToggle(button, root, () => storage)

    button.click()

    expect(root.getAttribute('data-theme')).toBeNull()
    expect(storage.getItem(THEME_STORAGE_KEY)).toBeNull()
    expect(button.textContent).toBe('System')
  })

  it('still changes the theme when storage access throws', () => {
    const button = fakeButton()
    const root = fakeRoot()

    expect(() => initThemeToggle(button, root, blockedAccess)).not.toThrow()
    expect(button.hidden).toBe(false)
    expect(() => button.click()).not.toThrow()
    expect(root.getAttribute('data-theme')).toBe('light')
    expect(() => button.click()).not.toThrow()
    expect(root.getAttribute('data-theme')).toBe('dark')
    expect(button.textContent).toBe('Dark')
  })

  it('still changes the theme when storage methods throw', () => {
    const button = fakeButton()
    const root = fakeRoot()
    const storage = throwingStorage()

    expect(() => initThemeToggle(button, root, () => storage)).not.toThrow()
    expect(() => button.click()).not.toThrow()
    expect(root.getAttribute('data-theme')).toBe('light')
    expect(() => button.click()).not.toThrow()
    expect(root.getAttribute('data-theme')).toBe('dark')
    expect(button.attr('aria-label')).toBe('Theme: dark. Change theme')
  })
})

describe('stored theme', () => {
  it.each(['light', 'dark'])(
    'applies a stored %s theme to the root',
    (theme) => {
      const root = fakeRoot()
      const storage = fakeStorage({ [THEME_STORAGE_KEY]: theme })

      applyStoredTheme(root, () => storage)

      expect(root.getAttribute('data-theme')).toBe(theme)
    }
  )

  it.each(['light', 'dark'])('reads a stored %s theme', (theme) => {
    const storage = fakeStorage({ [THEME_STORAGE_KEY]: theme })

    expect(readStoredTheme(() => storage)).toBe(theme)
  })

  it('leaves the root untouched and reads null when nothing is stored', () => {
    const root = fakeRoot()
    const storage = fakeStorage()

    applyStoredTheme(root, () => storage)

    expect(root.getAttribute('data-theme')).toBeNull()
    expect(readStoredTheme(() => storage)).toBeNull()
  })

  it.each(['system', 'purple', ''])(
    'ignores the invalid stored value %s',
    (value) => {
      const root = fakeRoot()
      const storage = fakeStorage({ [THEME_STORAGE_KEY]: value })

      applyStoredTheme(root, () => storage)

      expect(root.getAttribute('data-theme')).toBeNull()
      expect(readStoredTheme(() => storage)).toBeNull()
    }
  )

  it('survives storage access that throws', () => {
    const root = fakeRoot()

    expect(() => applyStoredTheme(root, blockedAccess)).not.toThrow()
    expect(readStoredTheme(blockedAccess)).toBeNull()
    expect(root.getAttribute('data-theme')).toBeNull()
  })

  it('survives a getItem that throws', () => {
    const root = fakeRoot()
    const storage = throwingStorage()

    expect(() => applyStoredTheme(root, () => storage)).not.toThrow()
    expect(readStoredTheme(() => storage)).toBeNull()
    expect(root.getAttribute('data-theme')).toBeNull()
  })
})
