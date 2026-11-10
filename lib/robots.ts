export function renderRobots(input: { siteUrl: string }): string {
  return [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${input.siteUrl}/sitemap.xml`,
    ''
  ].join('\n')
}
