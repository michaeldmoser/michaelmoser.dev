declare module '@11ty/eleventy-plugin-rss' {
  export function convertHtmlToAbsoluteUrls(
    html: string,
    base: string,
    options?: { closingSingleTag?: 'default' | 'slash' | 'tag' }
  ): Promise<string>
}
