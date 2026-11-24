import { Nav, type NavItem } from './nav.tsx'
import { ThemeToggle } from './theme-toggle.tsx'

export function Header(props: { items: NavItem[] }) {
  return (
    <header class='site-header'>
      <a href='/'>Michael Moser</a>
      <Nav items={props.items} />
      <ThemeToggle />
    </header>
  )
}
