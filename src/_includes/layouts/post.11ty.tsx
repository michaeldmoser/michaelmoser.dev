import { html } from 'jsx-async-runtime'
import { formatPostDate, isoDate } from '#lib/dates.ts'

interface PostData {
  title: string
  draft?: boolean
  content: string
  page: { date: Date }
  tags?: string[]
  tagVocabulary: Record<string, string>
}

export default class PostLayout {
  data() {
    return { layout: 'layouts/base.11ty.tsx' }
  }

  render(data: PostData) {
    const { date } = data.page
    return (
      <article>
        <h1>{data.title}</h1>
        {data.draft === true ? <p>Draft</p> : null}
        <p>
          <time datetime={isoDate(date)}>{formatPostDate(date)}</time>
        </p>
        <ul>
          {(data.tags ?? []).map((tag) => (
            <li>
              <a href={`/writing/tags/${tag}/`}>{data.tagVocabulary[tag]}</a>
            </li>
          ))}
        </ul>
        {html(data.content)}
      </article>
    )
  }
}
