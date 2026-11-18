export function ContactLink(props: {
  contact: { encoded: string; readable: string }
  label?: string
}) {
  return (
    <span data-contact={props.contact.encoded} data-contact-label={props.label}>
      {props.contact.readable}
    </span>
  )
}
