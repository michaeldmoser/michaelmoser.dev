import { beforeAll, describe, expect, it } from 'vitest'
import { buildScenario } from './scenario'

let main: string

function visibleText(html: string) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function roleText(text: string, company: string, next?: string) {
  const start = text.indexOf(company)
  const found = next ? text.indexOf(next, start) : -1
  const end = found === -1 ? text.length : found
  return text.slice(start, end)
}

beforeAll(async () => {
  const outcome = await buildScenario('experience')
  const page = outcome.results?.find((result) => result.url === '/experience/')
  main = page?.content.match(/<main[\s>]([\s\S]*)<\/main>/)?.[1] ?? ''
}, 60_000)

describe('experience page', () => {
  it('shows the summary first, then roles newest-first with dates, optional details and highlights', () => {
    expect(main).not.toBe('')
    const text = visibleText(main)

    const summary = text.indexOf(
      'Backend engineer who builds reliable data pipelines for small teams.'
    )
    const northwind = text.indexOf('Northwind Labs')
    const harbor = text.indexOf('Harbor Analytics')
    const fernwood = text.indexOf('Fernwood Systems')
    expect(summary).toBeGreaterThan(-1)
    expect(northwind).toBeGreaterThan(summary)
    expect(harbor).toBeGreaterThan(northwind)
    expect(fernwood).toBeGreaterThan(harbor)

    const current = roleText(text, 'Northwind Labs', 'Harbor Analytics')
    expect(current).toContain('Staff Engineer')
    expect(current).toContain('Mar 2021 – Present')
    expect(current).toContain('Remote')
    expect(current).toContain('Logistics software for regional carriers')
    expect(current).toContain('Led the migration to a single shared billing service.')
    expect(current).toContain('Mentored four engineers into senior roles.')

    const past = roleText(text, 'Harbor Analytics', 'Fernwood Systems')
    expect(past).toContain('Senior Engineer')
    expect(past).toContain('Jun 2018 – Feb 2021')
    expect(past).toContain('Ohio')
    expect(past).not.toContain('Logistics software')
    expect(past).not.toContain('Embedded tooling studio')
    expect(past).toContain('Cut nightly batch time from six hours to forty minutes.')
    expect(past).toContain('Rebuilt the sync engine around an event log.')

    const oldest = roleText(text, 'Fernwood Systems', 'Skills')
    expect(oldest).toContain('Engineer')
    expect(oldest).toContain('Sep 2015 – May 2018')
    expect(oldest).toContain('Embedded tooling studio')
    expect(oldest).not.toContain('Remote')
    expect(oldest).not.toContain('Ohio')
    expect(oldest).toContain('Shipped the first firmware update channel.')

    expect(text).not.toMatch(/undefined|null/)
  })

  it('shows skill groups as lists, then earlier experience with years only, then education', () => {
    const text = visibleText(main)

    const lastHighlight = text.indexOf(
      'Shipped the first firmware update channel.'
    )
    const languages = text.indexOf('Languages')
    const practices = text.indexOf('Practices')
    const earlierHeading = text.indexOf('Earlier experience')
    const education = text.indexOf('Lakeshore University')
    expect(lastHighlight).toBeGreaterThan(-1)
    expect(languages).toBeGreaterThan(lastHighlight)
    expect(practices).toBeGreaterThan(languages)
    expect(earlierHeading).toBeGreaterThan(practices)
    expect(education).toBeGreaterThan(earlierHeading)

    const items = [...main.matchAll(/<li[\s>][\s\S]*?<\/li>/g)].map((match) =>
      visibleText(match[0])
    )
    for (const keyword of [
      'TypeScript',
      'Python',
      'SQL',
      'Incident response',
      'Code review'
    ]) {
      expect(items).toContain(keyword)
    }

    const earlier = text.slice(earlierHeading, education)
    expect(earlier).toContain('Pinecrest Software')
    expect(earlier).toContain('Junior Developer')
    expect(earlier).toContain('2012–2016')
    expect(earlier).toContain('Copperline Media')
    expect(earlier).toContain('Web Developer')
    expect(earlier).toContain('2009–2011')
    expect(earlier).not.toMatch(/Mar 2009|Aug 2011|2009-03|2011-08/)

    const school = text.slice(education)
    expect(school).toContain('Bachelor of Science')
    expect(school).toContain('Computer Science')
    expect(school).toContain('2005–2009')
  })
})

describe('experience page post-linked highlights', () => {
  it('links a post highlight to its writing page and leaves plain highlights unlinked', () => {
    const anchors = [...main.matchAll(/<a\s[^>]*>[\s\S]*?<\/a>/g)].map(
      (match) => match[0]
    )

    const linked = anchors.filter((anchor) =>
      visibleText(anchor).includes('Rebuilt the sync engine around an event log.')
    )
    expect(linked).toHaveLength(1)
    expect(linked[0]).toMatch(/href="\/writing\/rebuilding-sync\/"/)

    for (const anchor of anchors) {
      expect(visibleText(anchor)).not.toContain(
        'Cut nightly batch time from six hours to forty minutes.'
      )
    }
    expect(visibleText(main)).toContain(
      'Cut nightly batch time from six hours to forty minutes.'
    )
  })
})

describe('experience page with a highlight pointing at a missing post', () => {
  it('fails the build naming the role and the missing slug', async () => {
    const outcome = await buildScenario('experience-dead-slug')

    expect(outcome.error).toBeDefined()
    const message = outcome.error?.message ?? ''
    expect(message).toContain('Invalid resume:')
    expect(message).toContain('Harbor Analytics')
    expect(message).toContain('Senior Engineer')
    expect(message).toContain('vanished-post-slug')
  }, 60_000)
})

describe('experience page with a highlight pointing at a draft post', () => {
  it('fails a production build naming the role and the draft slug as no such post', async () => {
    const outcome = await buildScenario('experience-draft-link')

    expect(outcome.error).toBeDefined()
    const message = outcome.error?.message ?? ''
    expect(message).toContain('Invalid resume:')
    expect(message).toContain('Harbor Analytics')
    expect(message).toContain('Senior Engineer')
    expect(message).toContain('unfinished-thoughts')
  }, 60_000)

  it('links the draft post from the highlight when serving locally', async () => {
    const outcome = await buildScenario('experience-draft-link', {
      runMode: 'serve'
    })

    expect(outcome.error).toBeUndefined()
    const page = outcome.results?.find(
      (result) => result.url === '/experience/'
    )
    const html = page?.content.match(/<main[\s>]([\s\S]*)<\/main>/)?.[1] ?? ''
    const anchors = [...html.matchAll(/<a\s[^>]*>[\s\S]*?<\/a>/g)].map(
      (match) => match[0]
    )
    const linked = anchors.filter((anchor) =>
      visibleText(anchor).includes('Wrote up the migration plan before it shipped.')
    )
    expect(linked).toHaveLength(1)
    expect(linked[0]).toMatch(/href="\/writing\/unfinished-thoughts\/"/)
  }, 60_000)
})

describe('experience page without education', () => {
  it('omits the education section and heading while the rest of the page renders', async () => {
    const outcome = await buildScenario('experience-no-education')
    const page = outcome.results?.find(
      (result) => result.url === '/experience/'
    )
    const html = page?.content.match(/<main[\s>]([\s\S]*)<\/main>/)?.[1] ?? ''
    const text = visibleText(html)

    expect(text).toContain('Northwind Labs')
    expect(text).toContain('Earlier experience')
    expect(text).toContain('Pinecrest Software')

    const headings = [...html.matchAll(/<h[1-6][\s>][\s\S]*?<\/h[1-6]>/g)].map(
      (match) => visibleText(match[0])
    )
    expect(headings.length).toBeGreaterThan(0)
    for (const heading of headings) {
      expect(heading).not.toMatch(/education/i)
    }
    expect(text).not.toMatch(/education/i)
  }, 60_000)
})
