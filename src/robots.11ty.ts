import { renderRobots } from '../lib/robots.ts'

export default class Robots {
  data() {
    return {
      permalink: '/robots.txt',
      layout: false,
      eleventyExcludeFromCollections: true
    }
  }

  render(data: { site: { url: string } }) {
    return renderRobots({ siteUrl: data.site.url })
  }
}
