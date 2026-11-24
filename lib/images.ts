export function isLocalImage(src: string): boolean {
  return !/^([a-z][a-z0-9+.-]*:|\/)/i.test(src)
}

export function altProblem(
  src: string,
  alt: string,
  inputPath: string
): string | null {
  if (alt.trim() === '') {
    return `${inputPath}: image "${src}" has no alt text`
  }
  return null
}
