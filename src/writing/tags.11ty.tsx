import {
  type ListedPost,
  PostList
} from '../_includes/components/post-list.tsx'

interface TagPage {
  tag: string
  label: string
  posts: ListedPost[]
}

export default class TagPageTemplate {
  data() {
    return {
      layout: 'layouts/base.11ty.tsx',
      pagination: { data: 'collections.tagPages', size: 1, alias: 'tagPage' },
      permalink: (data: { tagPage: TagPage }) =>
        `/writing/tags/${data.tagPage.tag}/`,
      eleventyComputed: {
        title: (data: { tagPage: TagPage }) =>
          `Posts tagged ${data.tagPage.label}`
      }
    }
  }

  render(data: { tagPage: TagPage }) {
    return (
      <>
        <h1>Posts tagged {data.tagPage.label}</h1>
        <PostList posts={data.tagPage.posts} />
      </>
    )
  }
}
