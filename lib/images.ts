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
