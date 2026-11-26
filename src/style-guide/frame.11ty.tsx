import { Specimens } from '../_includes/components/style-guide-specimens.tsx'

export default class StyleGuideFrame {
  data() {
    return {
      layout: 'layouts/style-guide-frame.11ty.tsx',
      themes: ['light', 'dark'],
      pagination: { data: 'themes', size: 1, alias: 'theme' },
      eleventyExcludeFromCollections: true,
      eleventyComputed: {
        title: (data: { theme: string }) => `Style guide: ${data.theme}`,
        permalink: (data: { devServer: boolean; theme: string }) =>
          data.devServer ? `/style-guide/${data.theme}/` : false
      }
    }
  }

  render(data: { theme: string }) {
    const heading = data.theme[0].toUpperCase() + data.theme.slice(1)
    return (
      <>
        <h1>{heading} theme</h1>
        <Specimens />
      </>
    )
  }
}
