export type JsonLdSite = {
  url: string
  title: string
}

export type JsonLdPersonSite = JsonLdSite & {
  jobTitle: string
  sameAs: string[]
  worksFor: { name: string; url: string }
}

export function personJsonLd(site: JsonLdPersonSite) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: site.title,
    jobTitle: site.jobTitle,
    url: site.url,
    sameAs: site.sameAs,
    worksFor: {
      '@type': 'Organization',
      name: site.worksFor.name,
      url: site.worksFor.url
    }
  }
}

export type JsonLdPost = {
  url: string
  title: string
  description: string
  date: Date
  image: string
}

export function blogPostingJsonLd(site: JsonLdSite, post: JsonLdPost) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    datePublished: post.date.toISOString(),
    url: post.url,
    image: post.image,
    description: post.description,
    author: {
      '@type': 'Person',
      name: site.title,
      url: site.url
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': post.url
    }
  }
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replaceAll('<', '\\u003c')
}
