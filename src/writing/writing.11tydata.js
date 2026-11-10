export default {
  layout: 'layouts/post.11ty.tsx',
  permalink: (data) => `/writing/${data.page.fileSlug}/`
}
