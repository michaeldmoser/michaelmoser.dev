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
