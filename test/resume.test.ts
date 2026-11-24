import { readFileSync } from 'node:fs'
import { load } from 'js-yaml'
import { describe, expect, it } from 'vitest'
import { checkResume } from '../lib/resume.ts'

type Doc = {
  basics: Record<string, unknown>
  work: Record<string, unknown>[]
  skills: Record<string, unknown>[]
  earlier: Record<string, unknown>[]
  education: Record<string, unknown>[]
}

const fixture = load(
  readFileSync('test/fixtures/experience/_data/resume.yaml', 'utf8')
) as Doc

const context = {
  postSlugs: new Set(['rebuilding-sync']),
  siteUrl: 'https://michaelmoser.dev'
}

function mutated(change: (doc: Doc) => void): unknown {
  const doc = structuredClone(fixture)
  change(doc)
  return doc
}

describe('checkResume required fields', () => {
  it('accepts the unmodified fixture without violations', () => {
    expect(checkResume(structuredClone(fixture), context).violations).toEqual(
      []
    )
  })

  it.each([
    {
      field: 'basics.summary',
      parts: ['basics', 'summary'],
      change: (doc: Doc) => delete doc.basics.summary
    },
    {
      field: 'work name',
      parts: ['work', '[0]', 'name'],
      change: (doc: Doc) => delete doc.work[0].name
    },
    {
      field: 'work position',
      parts: ['work', 'Harbor Analytics', 'position'],
      change: (doc: Doc) => delete doc.work[0].position
    },
    {
      field: 'work startDate',
      parts: ['work', 'Harbor Analytics', 'startDate'],
      change: (doc: Doc) => delete doc.work[0].startDate
    },
    {
      field: 'work highlights',
      parts: ['work', 'Harbor Analytics', 'highlights'],
      change: (doc: Doc) => delete doc.work[0].highlights
    },
    {
      field: 'skills name',
      parts: ['skills', '[0]', 'name'],
      change: (doc: Doc) => delete doc.skills[0].name
    },
    {
      field: 'skills keywords',
      parts: ['skills', 'Languages', 'keywords'],
      change: (doc: Doc) => delete doc.skills[0].keywords
    },
    {
      field: 'skills empty keywords',
      parts: ['skills', 'Languages', 'keywords'],
      change: (doc: Doc) => {
        doc.skills[0].keywords = []
      }
    },
    {
      field: 'earlier name',
      parts: ['earlier', '[0]', 'name'],
      change: (doc: Doc) => delete doc.earlier[0].name
    },
    {
      field: 'earlier position',
      parts: ['earlier', 'Pinecrest Software', 'position'],
      change: (doc: Doc) => delete doc.earlier[0].position
    },
    {
      field: 'earlier startDate',
      parts: ['earlier', 'Pinecrest Software', 'startDate'],
      change: (doc: Doc) => delete doc.earlier[0].startDate
    },
    {
      field: 'earlier endDate',
      parts: ['earlier', 'Pinecrest Software', 'endDate'],
      change: (doc: Doc) => delete doc.earlier[0].endDate
    },
    {
      field: 'education institution',
      parts: ['education', '[0]', 'institution'],
      change: (doc: Doc) => delete doc.education[0].institution
    }
  ])('names the section, entry and field when $field is missing', ({
    parts,
    change
  }) => {
    const { violations } = checkResume(mutated(change), context)

    expect(
      violations.some(line => parts.every(part => line.includes(part)))
    ).toBe(true)
  })
})

describe('checkResume dates', () => {
  it.each([
    {
      label: 'work startDate as a bare year string',
      parts: ['work', 'Harbor Analytics', 'startDate', '2018'],
      change: (doc: Doc) => {
        doc.work[0].startDate = '2018'
      }
    },
    {
      label: 'work startDate as an integer year',
      parts: ['work', 'Harbor Analytics', 'startDate', '2018'],
      change: (doc: Doc) => {
        doc.work[0].startDate = 2018
      }
    },
    {
      label: 'work startDate as a YAML date',
      parts: ['work', 'Harbor Analytics', 'startDate', '2021-03-15'],
      change: (doc: Doc) => {
        doc.work[0].startDate = load('2021-03-15')
      }
    },
    {
      label: 'work startDate with month 13',
      parts: ['work', 'Harbor Analytics', 'startDate', '2021-13'],
      change: (doc: Doc) => {
        doc.work[0].startDate = '2021-13'
      }
    },
    {
      label: 'work endDate with month 13',
      parts: ['work', 'Harbor Analytics', 'endDate', '2021-13'],
      change: (doc: Doc) => {
        doc.work[0].endDate = '2021-13'
      }
    },
    {
      label: 'earlier startDate with a one-digit month',
      parts: ['earlier', 'Pinecrest Software', 'startDate', '2012-1'],
      change: (doc: Doc) => {
        doc.earlier[0].startDate = '2012-1'
      }
    },
    {
      label: 'earlier startDate in words',
      parts: ['earlier', 'Pinecrest Software', 'startDate', 'twenty-twelve'],
      change: (doc: Doc) => {
        doc.earlier[0].startDate = 'twenty-twelve'
      }
    },
    {
      label: 'education endDate in words',
      parts: ['education', 'Lakeshore University', 'endDate', 'twenty-nine'],
      change: (doc: Doc) => {
        doc.education[0].endDate = 'twenty-nine'
      }
    }
  ])('names the entry, field and value for $label', ({ parts, change }) => {
    const { violations } = checkResume(mutated(change), context)

    expect(
      violations.some(line => parts.every(part => line.includes(part)))
    ).toBe(true)
  })

  it.each([
    {
      label: 'earlier integer year',
      change: (doc: Doc) => {
        doc.earlier[0].startDate = 2014
      }
    },
    {
      label: 'earlier year and month',
      change: (doc: Doc) => {
        doc.earlier[0].startDate = '2014-06'
      }
    },
    {
      label: 'education integer year',
      change: (doc: Doc) => {
        doc.education[0].startDate = 2014
        doc.education[0].endDate = 2015
      }
    },
    {
      label: 'education year and month',
      change: (doc: Doc) => {
        doc.education[0].startDate = '2014-06'
        doc.education[0].endDate = '2015-06'
      }
    }
  ])('accepts $label', ({ change }) => {
    expect(checkResume(mutated(change), context).violations).toEqual([])
  })
})

describe('checkResume current roles', () => {
  it.each([
    {
      label: 'two work roles without an endDate',
      names: ['Northwind Labs', 'Harbor Analytics'],
      change: (doc: Doc) => {
        delete doc.work[0].endDate
      }
    },
    {
      label: 'three work roles without an endDate',
      names: ['Northwind Labs', 'Harbor Analytics', 'Fernwood Systems'],
      change: (doc: Doc) => {
        delete doc.work[0].endDate
        delete doc.work[2].endDate
      }
    }
  ])('names every current role for $label', ({ names, change }) => {
    const { violations } = checkResume(mutated(change), context)

    for (const name of names) {
      expect(violations.some(line => line.includes(name))).toBe(true)
    }
    expect(
      violations.some(line => /endDate|current/i.test(line))
    ).toBe(true)
  })
})

describe('checkResume highlight shape', () => {
  it.each([
    {
      label: 'no highlights',
      parts: ['work', 'Harbor Analytics', 'highlights'],
      change: (doc: Doc) => {
        doc.work[0].highlights = []
      }
    },
    {
      label: 'six highlights',
      parts: ['work', 'Harbor Analytics', 'highlights'],
      change: (doc: Doc) => {
        doc.work[0].highlights = ['a', 'b', 'c', 'd', 'e', 'f']
      }
    },
    {
      label: 'a highlight object without text',
      parts: ['work', 'Harbor Analytics', 'text'],
      change: (doc: Doc) => {
        doc.work[0].highlights = [{ post: 'rebuilding-sync' }]
      }
    },
    {
      label: 'a highlight object with an extra key',
      parts: ['work', 'Harbor Analytics', 'url'],
      change: (doc: Doc) => {
        doc.work[0].highlights = [{ text: 'x', url: 'y' }]
      }
    }
  ])('names the role and problem for $label', ({ parts, change }) => {
    const { violations } = checkResume(mutated(change), context)

    expect(
      violations.some(line => parts.every(part => line.includes(part)))
    ).toBe(true)
  })

  it.each([
    {
      label: 'exactly five highlights',
      change: (doc: Doc) => {
        doc.work[0].highlights = ['a', 'b', 'c', 'd', 'e']
      }
    },
    {
      label: 'exactly one highlight',
      change: (doc: Doc) => {
        doc.work[0].highlights = ['a']
      }
    }
  ])('accepts $label', ({ change }) => {
    expect(checkResume(mutated(change), context).violations).toEqual([])
  })
})

describe('checkResume location', () => {
  it.each([
    { label: 'a city and state', value: 'Bozeman, Montana' },
    { label: 'a state abbreviation', value: 'MT' },
    { label: 'a lowercase remote', value: 'remote' },
    { label: 'a non-US place', value: 'Ontario' }
  ])('names the role and value for $label', ({ value }) => {
    const { violations } = checkResume(
      mutated(doc => {
        doc.work[0].location = value
      }),
      context
    )

    expect(
      violations.some(
        line =>
          line.includes('work') &&
          line.includes('Harbor Analytics') &&
          line.includes(value)
      )
    ).toBe(true)
  })

  it.each([
    { label: 'a state', value: 'Montana' },
    { label: 'a two-word state', value: 'New Hampshire' },
    { label: 'Remote', value: 'Remote' }
  ])('accepts $label', ({ value }) => {
    const result = checkResume(
      mutated(doc => {
        doc.work[0].location = value
      }),
      context
    )

    expect(result.violations).toEqual([])
  })

  it('accepts a role with no location', () => {
    const result = checkResume(
      mutated(doc => {
        delete doc.work[0].location
      }),
      context
    )

    expect(result.violations).toEqual([])
  })
})

describe('checkResume date order', () => {
  it.each([
    {
      label: 'work ending the month before it starts',
      parts: ['work', 'Harbor Analytics'],
      change: (doc: Doc) => {
        doc.work[0].startDate = '2018-06'
        doc.work[0].endDate = '2018-05'
      }
    },
    {
      label: 'earlier ending in an earlier year',
      parts: ['earlier', 'Pinecrest Software'],
      change: (doc: Doc) => {
        doc.earlier[0].startDate = 2016
        doc.earlier[0].endDate = 2012
      }
    },
    {
      label: 'earlier starting mid-year and ending the year before',
      parts: ['earlier', 'Pinecrest Software'],
      change: (doc: Doc) => {
        doc.earlier[0].startDate = '2014-06'
        doc.earlier[0].endDate = 2013
      }
    },
    {
      label: 'education ending in an earlier year',
      parts: ['education', 'Lakeshore University'],
      change: (doc: Doc) => {
        doc.education[0].startDate = 2009
        doc.education[0].endDate = 2005
      }
    }
  ])('names the entry for $label', ({ parts, change }) => {
    const { violations } = checkResume(mutated(change), context)

    expect(
      violations.some(line => parts.every(part => line.includes(part)))
    ).toBe(true)
  })

  it.each([
    {
      label: 'work starting and ending in the same month',
      change: (doc: Doc) => {
        doc.work[0].startDate = '2018-06'
        doc.work[0].endDate = '2018-06'
      }
    },
    {
      label: 'earlier starting mid-year and ending in the same year',
      change: (doc: Doc) => {
        doc.earlier[0].startDate = '2014-06'
        doc.earlier[0].endDate = 2014
      }
    }
  ])('accepts $label', ({ change }) => {
    expect(checkResume(mutated(change), context).violations).toEqual([])
  })
})
