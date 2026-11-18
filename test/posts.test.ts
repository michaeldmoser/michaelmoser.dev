import { describe, expect, it } from 'vitest'
import {
  checkPosts,
  draftPolicy,
  isCi,
  type PostEntry,
  type RunContext,
  selectFeatured,
  type Vocabulary
} from '../lib/posts.ts'

const vocabulary: Vocabulary = { notes: 'Notes' }
const context: RunContext = { runMode: 'build', env: {} }
const path = './src/writing/hello-world/index.md'

function entry(
  frontmatter: Record<string, unknown>,
  inputPath = path
): PostEntry {
  return { inputPath, frontmatter }
}

const valid = {
  title: 'Hello world',
  date: new Date('2026-11-09'),
  description: 'A first post'
}

function without(field: string): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...valid }
  delete copy[field]
  return copy
}

describe('checkPosts required fields', () => {
  it('accepts a post with title, date and description', () => {
    const result = checkPosts([entry(valid)], vocabulary, context)
    expect(result.violations).toEqual([])
    expect(result.posts).toHaveLength(1)
  })

  it('accepts a post whose date arrives as an ISO string', () => {
    const result = checkPosts(
      [entry({ ...valid, date: '2026-11-09' })],
      vocabulary,
      context
    )
    expect(result.violations).toEqual([])
  })

  it.each(['title', 'date', 'description'])(
    'reports a violation naming the path and the missing %s',
    (field) => {
      const result = checkPosts([entry(without(field))], vocabulary, context)
      expect(result.violations).toHaveLength(1)
      expect(result.violations[0]).toContain(path)
      expect(result.violations[0]).toContain(field)
      expect(result.posts).toEqual([])
    }
  )

  it('reports a violation naming the path and the date when the date does not parse', () => {
    const result = checkPosts(
      [entry({ ...valid, date: 'not a date' })],
      vocabulary,
      context
    )
    expect(result.violations).toHaveLength(1)
    expect(result.violations[0]).toContain(path)
    expect(result.violations[0]).toContain('date')
  })

  it('reports every field missing from one post', () => {
    const result = checkPosts([entry({})], vocabulary, context)
    for (const field of ['title', 'date', 'description']) {
      expect(
        result.violations.some((v) => v.includes(path) && v.includes(field))
      ).toBe(true)
    }
  })

  it('names only the invalid post when another post is valid', () => {
    const otherPath = './src/writing/second-post/index.md'
    const result = checkPosts(
      [entry(valid), entry(without('title'), otherPath)],
      vocabulary,
      context
    )
    expect(result.violations).toHaveLength(1)
    expect(result.violations[0]).toContain(otherPath)
    expect(result.violations[0]).not.toContain(path)
  })
})

describe('checkPosts post locations', () => {
  const at = (folder: string) => `./src/writing/${folder}/index.md`
  const nonKebabFolders = [
    'Hello',
    'hello_world',
    'hello--world',
    '-hello',
    'hello-',
    'hello world'
  ]
  const strayFiles = [
    './src/writing/foo.md',
    './src/writing/a/foo/index.md',
    './src/writing/foo/other.md'
  ]

  it.each(['hello-world', 'post-2', '2026-recap', 'a', 'a-b-c-1'])(
    'accepts the kebab-case folder %s',
    (slug) => {
      const result = checkPosts([entry(valid, at(slug))], vocabulary, context)
      expect(result.violations).toEqual([])
      expect(result.posts).toHaveLength(1)
    }
  )

  it.each(nonKebabFolders)(
    'reports a violation naming the path for the non-kebab-case folder %s',
    (slug) => {
      const result = checkPosts([entry(valid, at(slug))], vocabulary, context)
      expect(result.violations.length).toBeGreaterThan(0)
      expect(result.violations.some((v) => v.includes(at(slug)))).toBe(true)
      expect(result.posts).toEqual([])
    }
  )

  it.each(strayFiles)(
    'reports a violation naming the path for the stray markdown file %s',
    (stray) => {
      const result = checkPosts([entry(valid, stray)], vocabulary, context)
      expect(result.violations.length).toBeGreaterThan(0)
      expect(result.violations.some((v) => v.includes(stray))).toBe(true)
      expect(result.posts).toEqual([])
    }
  )

  it('reports a violation naming both paths when two folders differ only by case', () => {
    const upper = at('Foo')
    const lower = at('foo')
    const result = checkPosts(
      [entry(valid, upper), entry(valid, lower)],
      vocabulary,
      context
    )
    expect(
      result.violations.some((v) => v.includes(upper) && v.includes(lower))
    ).toBe(true)
  })
})

describe('checkPosts tags and ordering', () => {
  const tagVocabulary: Vocabulary = { kubernetes: 'Kubernetes', notes: 'Notes' }
  const at = (folder: string) => `./src/writing/${folder}/index.md`

  it('accepts a post whose tags are all in the vocabulary', () => {
    const result = checkPosts(
      [entry({ ...valid, tags: ['kubernetes', 'notes'] })],
      tagVocabulary,
      context
    )
    expect(result.violations).toEqual([])
    expect(result.posts).toHaveLength(1)
  })

  it('accepts a post with no tags', () => {
    const result = checkPosts([entry(valid)], tagVocabulary, context)
    expect(result.violations).toEqual([])
  })

  it('accepts a post with an empty tags list', () => {
    const result = checkPosts(
      [entry({ ...valid, tags: [] })],
      tagVocabulary,
      context
    )
    expect(result.violations).toEqual([])
  })

  it('reports a violation naming the path and the tag outside the vocabulary', () => {
    const result = checkPosts(
      [entry({ ...valid, tags: ['notes', 'gardening'] })],
      tagVocabulary,
      context
    )
    expect(
      result.violations.some((v) => v.includes(path) && v.includes('gardening'))
    ).toBe(true)
    expect(result.posts).toEqual([])
  })

  it('treats a case variant of a vocabulary tag as unknown', () => {
    const result = checkPosts(
      [entry({ ...valid, tags: ['Kubernetes'] })],
      tagVocabulary,
      context
    )
    expect(
      result.violations.some(
        (v) => v.includes(path) && v.includes('Kubernetes')
      )
    ).toBe(true)
  })

  it('returns valid posts newest first, breaking same-day ties by time', () => {
    const entries = [
      entry({ ...valid, date: new Date('2026-03-01') }, at('oldest')),
      entry({ ...valid, date: '2026-11-09T09:00:00Z' }, at('same-day-morning')),
      entry({ ...valid, date: new Date('2026-06-15') }, at('middle')),
      entry({ ...valid, date: '2026-11-09T17:00:00Z' }, at('same-day-evening'))
    ]
    const result = checkPosts(entries, tagVocabulary, context)
    expect(result.violations).toEqual([])
    expect(result.posts.map((p) => p.inputPath)).toEqual([
      at('same-day-evening'),
      at('same-day-morning'),
      at('middle'),
      at('oldest')
    ])
  })
})

describe('checkPosts string-form tags', () => {
  const tagVocabulary: Vocabulary = { kubernetes: 'Kubernetes', notes: 'Notes' }

  it('accepts a known tag given as a single string', () => {
    const result = checkPosts(
      [entry({ ...valid, tags: 'notes' })],
      tagVocabulary,
      context
    )
    expect(result.violations).toEqual([])
    expect(result.posts).toHaveLength(1)
  })

  it('reports a violation naming the path and an unknown tag given as a single string', () => {
    const result = checkPosts(
      [entry({ ...valid, tags: 'gardening' })],
      tagVocabulary,
      context
    )
    expect(
      result.violations.some((v) => v.includes(path) && v.includes('gardening'))
    ).toBe(true)
    expect(result.posts).toEqual([])
  })
})

describe('isCi', () => {
  const absentEnvs = [
    {},
    { CI: '' },
    { WORKERS_CI: '' },
    { CI: undefined },
    { CI: '', WORKERS_CI: '' }
  ]

  it.each([{ CI: 'true' }, { WORKERS_CI: '1' }, { CI: '1', WORKERS_CI: '1' }])(
    'is true when %o is set',
    (env) => {
      expect(isCi(env)).toBe(true)
    }
  )

  it.each(absentEnvs)('is false when %o is absent or empty', (env) => {
    expect(isCi(env)).toBe(false)
  })
})

describe('draftPolicy', () => {
  it('renders drafts under serve without CI', () => {
    expect(draftPolicy({ runMode: 'serve', env: {} })).toBe('render')
  })

  it.each(['build', 'watch'] as const)(
    'excludes drafts under %s without CI',
    (runMode) => {
      expect(draftPolicy({ runMode, env: {} })).toBe('exclude')
    }
  )

  it.each(['build', 'watch', 'serve'] as const)(
    'fails on drafts under %s when CI is set',
    (runMode) => {
      expect(draftPolicy({ runMode, env: { CI: 'true' } })).toBe('fail')
    }
  )

  it.each(['build', 'serve'] as const)(
    'fails on drafts under %s when WORKERS_CI is set',
    (runMode) => {
      expect(draftPolicy({ runMode, env: { WORKERS_CI: '1' } })).toBe('fail')
    }
  )

  it('does not treat empty CI variables as CI', () => {
    expect(
      draftPolicy({ runMode: 'serve', env: { CI: '', WORKERS_CI: '' } })
    ).toBe('render')
  })
})

describe('selectFeatured picks', () => {
  const at = (name: string) => `./src/writing/${name}/index.md`
  const post = (name: string, featured?: unknown) =>
    entry(featured === undefined ? valid : { ...valid, featured }, at(name))
  const pick = (posts: PostEntry[]) => {
    const result = selectFeatured(posts)
    return {
      paths: result.featured.map((p) => p.inputPath),
      violations: result.violations
    }
  }

  it('takes the three newest posts when none are marked', () => {
    const result = pick([post('a'), post('b'), post('c'), post('d'), post('e')])
    expect(result.paths).toEqual([at('a'), at('b'), at('c')])
    expect(result.violations).toEqual([])
  })

  it('puts one marked post first then fills with the newest unmarked', () => {
    const result = pick([
      post('a'),
      post('b'),
      post('c', true),
      post('d'),
      post('e')
    ])
    expect(result.paths).toEqual([at('c'), at('a'), at('b')])
    expect(result.violations).toEqual([])
  })

  it('returns exactly three marked posts newest first with no fill', () => {
    const result = pick([
      post('a'),
      post('b', true),
      post('c', true),
      post('d'),
      post('e', true)
    ])
    expect(result.paths).toEqual([at('b'), at('c'), at('e')])
    expect(result.violations).toEqual([])
  })

  it('returns every post newest first when fewer than three exist', () => {
    const result = pick([post('a'), post('b', true)])
    expect(result.paths).toEqual([at('b'), at('a')])
    expect(result.violations).toEqual([])
  })

  it('keeps a marked older post ahead of newer unmarked fill-ins', () => {
    const result = pick([post('a'), post('b'), post('c'), post('z', true)])
    expect(result.paths).toEqual([at('z'), at('a'), at('b')])
    expect(result.violations).toEqual([])
  })

  it('does not count a truthy non-boolean featured value as marked', () => {
    const result = pick([post('a'), post('b'), post('c'), post('d', 'yes')])
    expect(result.paths).toEqual([at('a'), at('b'), at('c')])
    expect(result.violations).toEqual([])
  })

  it('returns nothing for an empty list', () => {
    const result = pick([])
    expect(result.paths).toEqual([])
    expect(result.violations).toEqual([])
  })
})

describe('selectFeatured over-marking', () => {
  const at = (name: string) => `./src/writing/${name}/index.md`
  const marked = ['a', 'b', 'c', 'd']
  const unmarked = ['e', 'f']
  const posts = [
    entry({ ...valid, featured: true }, at('a')),
    entry(valid, at('e')),
    entry({ ...valid, featured: true }, at('b')),
    entry({ ...valid, featured: true }, at('c')),
    entry(valid, at('f')),
    entry({ ...valid, featured: true }, at('d'))
  ]

  it('reports one violation naming every marked post when more than three are marked', () => {
    const result = selectFeatured(posts)
    expect(result.violations).toHaveLength(1)
    for (const name of marked) {
      expect(result.violations[0]).toContain(at(name))
    }
    for (const name of unmarked) {
      expect(result.violations[0]).not.toContain(at(name))
    }
  })
})

describe('checkPosts drafts', () => {
  const draftPath = './src/writing/work-in-progress/index.md'
  const draft = entry({ ...valid, draft: true }, draftPath)
  const published = entry(valid)
  const withContext = (
    runMode: RunContext['runMode'],
    env: RunContext['env']
  ): RunContext => ({
    runMode,
    env
  })

  it('reports a violation naming the draft in CI', () => {
    const result = checkPosts(
      [published, draft],
      vocabulary,
      withContext('build', { CI: 'true' })
    )
    expect(result.violations.some((v) => v.includes(draftPath))).toBe(true)
    expect(result.posts.map((p) => p.inputPath)).not.toContain(draftPath)
  })

  it('reports a violation naming the draft in CI even when serving', () => {
    const result = checkPosts(
      [draft],
      vocabulary,
      withContext('serve', { CI: 'true' })
    )
    expect(result.violations.some((v) => v.includes(draftPath))).toBe(true)
  })

  it('excludes a draft with a warning and no violation on a plain build', () => {
    const result = checkPosts(
      [published, draft],
      vocabulary,
      withContext('build', {})
    )
    expect(result.violations).toEqual([])
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain(draftPath)
    expect(result.posts.map((p) => p.inputPath)).toEqual([path])
  })

  it('excludes a draft with a warning when watching', () => {
    const result = checkPosts(
      [published, draft],
      vocabulary,
      withContext('watch', {})
    )
    expect(result.violations).toEqual([])
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain(draftPath)
    expect(result.posts.map((p) => p.inputPath)).toEqual([path])
  })

  it('renders a draft without warning or violation when serving', () => {
    const result = checkPosts(
      [published, draft],
      vocabulary,
      withContext('serve', {})
    )
    expect(result.violations).toEqual([])
    expect(result.warnings).toEqual([])
    expect(result.posts.map((p) => p.inputPath).sort()).toEqual(
      [draftPath, path].sort()
    )
  })

  it('leaves a published post unaffected when no draft is present', () => {
    const result = checkPosts([published], vocabulary, withContext('build', {}))
    expect(result.violations).toEqual([])
    expect(result.warnings).toEqual([])
    expect(result.posts).toHaveLength(1)
  })

  it('still reports a missing field on a draft that would render', () => {
    const incomplete = entry(
      { title: 'Draft', date: new Date('2026-11-09'), draft: true },
      draftPath
    )
    const result = checkPosts(
      [incomplete],
      vocabulary,
      withContext('serve', {})
    )
    expect(
      result.violations.some(
        (v) => v.includes(draftPath) && v.includes('description')
      )
    ).toBe(true)
  })
})
