export default {
  layout: 'layouts/post.11ty.tsx',
  noindex: true,
  permalink: (data) =>
    data.devServer ? `/writing/${data.page.fileSlug}/` : false
}
