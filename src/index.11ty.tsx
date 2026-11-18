import { ContactLink } from './_includes/components/contact-link.tsx'
import type { ListedPost } from './_includes/components/post-list.tsx'

export default class Home {
  data() {
    return {
      layout: 'layouts/base.11ty.tsx',
      title: 'Michael Moser',
      permalink: '/'
    }
  }

  render(data: {
    contact: { encoded: string; readable: string }
    collections: { featuredPosts: ListedPost[] }
  }) {
    const { featuredPosts } = data.collections
    return (
      <>
        <h1>Michael Moser</h1>
        <p>
          I'm Michael Moser, a Staff Software Engineer in Montana. I work at
          Uplisting, where I build [TODO Michael: what you build there, in a few
          words], and the part I find most interesting is usually what happens
          after something ships: whether a team can realistically run it,
          support it and keep changing it.
        </p>
        <p>This is where I write about building and running software.</p>
        <p>
          <a href='https://www.linkedin.com/in/michaeldmoser/'>LinkedIn</a>{' '}
          <a href='https://github.com/michaeldmoser'>GitHub</a>{' '}
          <ContactLink contact={data.contact} />
        </p>
        {featuredPosts.length > 0 ? (
          <section id='featured'>
            <h2>Featured</h2>
            <ul>
              {featuredPosts.map((post) => (
                <li>
                  <a href={post.url}>{post.data.title}</a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </>
    )
  }
}
