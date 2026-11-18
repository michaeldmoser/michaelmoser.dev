import { html } from 'jsx-async-runtime'
import { ContactLink } from '../components/contact-link.tsx'

interface AboutData {
  content: string
  contact: { encoded: string; readable: string }
}

export default class AboutLayout {
  data() {
    return { layout: 'layouts/base.11ty.tsx' }
  }

  render(data: AboutData) {
    return (
      <article>
        {html(data.content)}
        <p>
          <ContactLink contact={data.contact} />
        </p>
      </article>
    )
  }
}
