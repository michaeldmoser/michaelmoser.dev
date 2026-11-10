import { renderAtomFeed } from '../lib/feed.ts'

export default class Feed {
  data() {
    return { permalink: '/feed.xml', eleventyExcludeFromCollections: true }
  }

  render(data) {
    return renderAtomFeed({ site: data.site, posts: [] })
  }
}
