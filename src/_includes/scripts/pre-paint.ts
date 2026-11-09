import { applyStoredTheme } from '../../../lib/theme.ts'

applyStoredTheme(document.documentElement, () => localStorage)
