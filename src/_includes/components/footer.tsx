import { ContactLink } from './contact-link.tsx'

export function Footer(props: {
  contact: { encoded: string; readable: string }
}) {
  return (
    <footer class='site-footer no-print'>
      <a href='https://github.com/michaeldmoser'>GitHub</a>
      <a href='https://www.linkedin.com/in/michaeldmoser/'>LinkedIn</a>
      <ContactLink contact={props.contact} />
    </footer>
  )
}
