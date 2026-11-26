export default class StyleGuide {
  data() {
    return {
      layout: 'layouts/base.11ty.tsx',
      title: 'Style guide',
      noindex: true,
      eleventyExcludeFromCollections: true,
      permalink: (data: { devServer: boolean }) =>
        data.devServer ? '/style-guide/' : false
    }
  }

  render() {
    return (
      <>
        <h1>Style guide</h1>
        <iframe src='/style-guide/light/' title='Light theme'></iframe>
        <iframe src='/style-guide/dark/' title='Dark theme'></iframe>
      </>
    )
  }
}
