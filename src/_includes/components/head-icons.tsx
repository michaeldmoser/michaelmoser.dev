const fontPreloads = [
  '/assets/fonts/JetBrainsMono-Regular.woff2',
  '/assets/fonts/JetBrainsMono-Bold.woff2'
]

export function HeadIcons() {
  return (
    <>
      <link rel='icon' type='image/svg+xml' href='/favicon.svg' />
      <link rel='apple-touch-icon' href='/apple-touch-icon.png' />
      {fontPreloads.map((href) => (
        <link
          rel='preload'
          href={href}
          as='font'
          type='font/woff2'
          crossorigin
        />
      ))}
    </>
  )
}
