import { html } from 'jsx-async-runtime'
import { HeadIcons } from '../components/head-icons.tsx'
import { specimenCss } from '../components/style-guide-specimens.tsx'

export default function styleGuideFrame(data: {
  content: string
  title?: string
  theme: 'light' | 'dark'
}) {
  return (
    <>
      {html('<!DOCTYPE html>')}
      <html lang='en' data-theme={data.theme}>
        <head>
          <meta charset='utf-8' />
          <meta name='viewport' content='width=device-width, initial-scale=1' />
          <meta name='robots' content='noindex' />
          <title>{data.title}</title>
          <HeadIcons />
          <link rel='stylesheet' href='/assets/css/site.css' />
          <style>{html(specimenCss)}</style>
        </head>
        <body>
          <main>{html(data.content)}</main>
        </body>
      </html>
    </>
  )
}
