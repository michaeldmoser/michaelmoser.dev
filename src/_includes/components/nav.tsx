export type NavItem = { label: string; href: string }

export function Nav(props: { items: NavItem[]; currentUrl: string }) {
  return (
    <nav class='site-nav no-print'>
      {props.items.map((item) => (
        <a
          href={item.href}
          aria-current={
            props.currentUrl.startsWith(item.href) ? 'page' : undefined
          }
        >
          {item.label}
        </a>
      ))}
    </nav>
  )
}
