export type NavItem = { label: string; href: string }

export function Nav(props: { items: NavItem[] }) {
  return (
    <nav class='site-nav no-print'>
      {props.items.map((item) => (
        <a href={item.href}>{item.label}</a>
      ))}
    </nav>
  )
}
