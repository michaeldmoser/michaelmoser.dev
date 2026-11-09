export type Theme = 'light' | 'dark'
export type ThemeChoice = Theme | 'system'

export const THEME_STORAGE_KEY = 'theme'

export interface ThemeRoot {
  getAttribute(name: string): string | null
  setAttribute(name: string, value: string): void
  removeAttribute(name: string): void
}

export interface ThemeStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface ThemeButton {
  hidden: boolean
  textContent: string | null
  setAttribute(name: string, value: string): void
  addEventListener(type: 'click', listener: () => void): void
}

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark'
}

export function readStoredTheme(getStorage: () => ThemeStorage): Theme | null {
  try {
    const value = getStorage().getItem(THEME_STORAGE_KEY)
    return isTheme(value) ? value : null
  } catch {
    return null
  }
}

const NEXT_CHOICE: Record<ThemeChoice, ThemeChoice> = {
  light: 'dark',
  dark: 'system',
  system: 'light'
}

const CHOICE_LABEL: Record<ThemeChoice, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System'
}

export function nextChoice(current: ThemeChoice): ThemeChoice {
  return NEXT_CHOICE[current]
}

function saveChoice(getStorage: () => ThemeStorage, choice: ThemeChoice): void {
  try {
    const storage = getStorage()
    if (choice === 'system') {
      storage.removeItem(THEME_STORAGE_KEY)
    } else {
      storage.setItem(THEME_STORAGE_KEY, choice)
    }
  } catch {}
}

function showChoice(
  button: ThemeButton,
  root: ThemeRoot,
  choice: ThemeChoice
): void {
  if (choice === 'system') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', choice)
  }
  button.textContent = CHOICE_LABEL[choice]
  button.setAttribute('aria-label', `Theme: ${choice}. Change theme`)
}

export function initThemeToggle(
  button: ThemeButton,
  root: ThemeRoot,
  getStorage: () => ThemeStorage
): void {
  let choice: ThemeChoice = readStoredTheme(getStorage) ?? 'system'
  showChoice(button, root, choice)
  button.hidden = false
  button.addEventListener('click', () => {
    choice = nextChoice(choice)
    showChoice(button, root, choice)
    saveChoice(getStorage, choice)
  })
}

export function applyStoredTheme(
  root: ThemeRoot,
  getStorage: () => ThemeStorage
): void {
  const theme = readStoredTheme(getStorage)
  if (theme) {
    root.setAttribute('data-theme', theme)
  }
}
