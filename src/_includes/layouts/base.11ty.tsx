import { html } from 'jsx-async-runtime'
import { Footer } from '../components/footer.tsx'
import { Header } from '../components/header.tsx'

const navItems = [
  { label: 'Writing', href: '/writing/' },
  { label: 'Experience', href: '/experience/' },
  { label: 'About', href: '/about/' }
]

const favicon = `data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect width='16' height='16' rx='3' fill='#0b57d0'/></svg>"
)}`

export default function base(data: {
  content: string
  title?: string
  prePaintScript: string
  site: { feedTitle: string }
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
          <link rel='icon' type='image/svg+xml' href={favicon} />
          <link
            rel='alternate'
            type='application/atom+xml'
            href='/feed.xml'
            title={data.site.feedTitle}
          />
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
