import { compileSiteCss } from './_includes/site-css.ts'

export default class SiteCss {
  data() {
    return {
      permalink: '/assets/css/site.css',
      layout: false,
      eleventyExcludeFromCollections: true
    }
  }

  render() {
    return compileSiteCss()
  }
}
