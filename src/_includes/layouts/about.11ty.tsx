import { html } from 'jsx-async-runtime'

interface AboutData {
  content: string
}

export default class AboutLayout {
  data() {
    return { layout: 'layouts/base.11ty.tsx' }
  }

  render(data: AboutData) {
    return <article>{html(data.content)}</article>
  }
}
