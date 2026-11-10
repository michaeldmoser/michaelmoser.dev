import {
  blogPostingJsonLd,
  personJsonLd,
  serializeJsonLd,
  type JsonLdPersonSite
} from './jsonld.ts'

const personPages = ['/', '/about/']

export type SeoSite = JsonLdPersonSite & {
  description: string
}

export type SeoPage = {
  url: string
  title?: string
  description?: string
  tagLabel?: string
  noindex?: boolean
  post?: { date: Date }
}

export type PageMeta = {
  title: string
  description: string
  canonical: string
  ogTitle: string
  ogType: 'article' | 'website'
  ogImage: string
  siteName: string
  twitterCard: 'summary_large_image'
  noindex: boolean
  jsonLd: string[]
}

function describe(site: SeoSite, page: SeoPage): string {
  if (page.tagLabel !== undefined) {
    return `Posts about ${page.tagLabel} by ${site.title}`
  }
  return page.description ?? site.description
}

export function pageMeta(input: { site: SeoSite; page: SeoPage }): PageMeta {
  const { site, page } = input
  const canonical = `${site.url}${page.url}`
  const bareTitle = page.title ?? site.title
  const title =
    page.url === '/' || page.title === undefined
      ? site.title
      : `${page.title} — ${site.title}`
  const description = describe(site, page)
  const ogImage = `${site.url}/assets/images/og-default.png`
  const jsonLd: string[] = []
  if (page.post) {
    jsonLd.push(
      serializeJsonLd(
        blogPostingJsonLd(site, {
          url: canonical,
          title: bareTitle,
          description,
          date: page.post.date,
          image: ogImage
        })
      )
    )
  }
  if (personPages.includes(page.url)) {
    jsonLd.push(serializeJsonLd(personJsonLd(site)))
  }
  return {
    title,
    description,
    canonical,
    ogTitle: bareTitle,
    ogType: page.post ? 'article' : 'website',
    ogImage,
    siteName: site.title,
    twitterCard: 'summary_large_image',
    noindex: page.noindex === true,
    jsonLd
  }
}
