declare module '@11ty/eleventy-plugin-syntaxhighlight' {
  const syntaxHighlight: {
    pairedShortcode(content: string, language: string): string
  }
  export default syntaxHighlight
}
