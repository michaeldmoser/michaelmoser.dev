import {
  type ListedPost,
  PostList
} from '../_includes/components/post-list.tsx'

export default class WritingIndex {
  data() {
    return {
      layout: 'layouts/base.11ty.tsx',
      title: 'Writing',
      permalink: '/writing/'
    }
  }

  render(data: { collections: { posts: ListedPost[] } }) {
    const { posts } = data.collections
    return (
      <>
        <h1>Writing</h1>
        {posts.length === 0 ? (
          <p>First posts coming soon</p>
        ) : (
          <PostList posts={posts} />
        )}
      </>
    )
  }
}
