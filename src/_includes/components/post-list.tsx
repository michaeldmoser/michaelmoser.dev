import { formatPostDate, isoDate } from '#lib/dates.ts'

export interface ListedPost {
  url: string
  date: Date
  data: { title: string; description: string; draft?: boolean }
}

export function PostList({ posts }: { posts: ListedPost[] }) {
  return (
    <ul>
      {posts.map((post) => (
        <li>
          <a href={post.url}>{post.data.title}</a>
          {post.data.draft === true ? <strong>Draft</strong> : null}
          <time datetime={isoDate(post.date)}>{formatPostDate(post.date)}</time>
          <p>{post.data.description}</p>
        </li>
      ))}
    </ul>
  )
}
