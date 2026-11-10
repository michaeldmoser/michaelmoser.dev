import { html } from 'jsx-async-runtime'
import { pageMeta, type SeoSite } from '#lib/seo.ts'
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
  description?: string
  tagLabel?: string
  noindex?: boolean
  isPost?: boolean
  page: { url: string; date: Date }
  prePaintScript: string
  site: SeoSite & { feedTitle: string }
}) {
  const meta = pageMeta({
    site: data.site,
    page: {
      url: data.page.url,
      title: data.title,
      description: data.description,
      tagLabel: data.tagLabel,
      noindex: data.noindex,
      post: data.isPost ? { date: data.page.date } : undefined
    }
  })
  return (
    <>
      {html('<!doctype html>')}
      <html lang='en'>
        <head>
          <meta charset='utf-8' />
          <meta name='viewport' content='width=device-width, initial-scale=1' />
          <script>{html(data.prePaintScript)}</script>
          <title>{meta.title}</title>
          <meta name='description' content={meta.description} />
          {meta.noindex ? <meta name='robots' content='noindex' /> : null}
          <link rel='canonical' href={meta.canonical} />
          <meta property='og:title' content={meta.ogTitle} />
          <meta property='og:description' content={meta.description} />
          <meta property='og:url' content={meta.canonical} />
          <meta property='og:image' content={meta.ogImage} />
          <meta property='og:type' content={meta.ogType} />
          <meta property='og:site_name' content={meta.siteName} />
          <meta name='twitter:card' content={meta.twitterCard} />
          {meta.jsonLd.map((block) => (
            <script type='application/ld+json'>{html(block)}</script>
          ))}
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
