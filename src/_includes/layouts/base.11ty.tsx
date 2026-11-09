import { html } from 'jsx-async-runtime'
import { Footer } from '../components/footer.tsx'
import { Header } from '../components/header.tsx'

const navItems = [
  { label: 'Writing', href: '/writing/' },
  { label: 'Experience', href: '/experience/' },
  { label: 'About', href: '/about/' }
]

export default function base(data: {
  content: string
  title?: string
  prePaintScript: string
}) {
  return (
    <>
      {html('<!doctype html>')}
      <html lang='en'>
        <head>
          <meta charset='utf-8' />
          <meta name='viewport' content='width=device-width, initial-scale=1' />
          <script>{html(data.prePaintScript)}</script>
          <title>{data.title}</title>
          <link rel='stylesheet' href='/assets/css/site.css' />
          <script src='/assets/js/theme.js' defer></script>
        </head>
        <body>
          <Header items={navItems} />
          <main>{html(data.content)}</main>
          <Footer />
        </body>
      </html>
    </>
  )
}
