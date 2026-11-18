function reverse(value: string): string {
  return [...value].reverse().join('')
}

export function encodeAddress(address: string): string {
  return btoa(reverse(address))
}

export function readableAddress(address: string): string {
  const at = address.lastIndexOf('@')
  const local = address.slice(0, at)
  const domain = address.slice(at + 1).replaceAll('.', ' [dot] ')
  return `${local} [at] ${domain}`
}

export function decodeAddress(encoded: string): string {
  return reverse(atob(encoded))
}

export interface ContactAnchor {
  href: string
  textContent: string | null
}

export interface ContactPlaceholder {
  getAttribute(name: string): string | null
  replaceWith(node: ContactAnchor): void
}

export interface ContactDocument {
  querySelectorAll(selector: '[data-contact]'): ArrayLike<ContactPlaceholder>
  createElement(tag: 'a'): ContactAnchor
}

const mailScheme = ['mail', 'to'].join('')

export function initContactLinks(doc: ContactDocument): void {
  for (const placeholder of Array.from(
    doc.querySelectorAll('[data-contact]')
  )) {
    const anchor = doc.createElement('a')
    const address = decodeAddress(
      placeholder.getAttribute('data-contact') ?? ''
    )
    anchor.href = [mailScheme, address].join(':')
    anchor.textContent =
      placeholder.getAttribute('data-contact-label') ?? 'Email'
    placeholder.replaceWith(anchor)
  }
}
