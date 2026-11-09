import { initThemeToggle, type ThemeButton } from '../../../lib/theme.ts'

const button = document.getElementById('theme-toggle')

if (button) {
  initThemeToggle(
    button as unknown as ThemeButton,
    document.documentElement,
    () => localStorage
  )
}
