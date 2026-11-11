import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))

const page = (body: string) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Page</title>
</head>
<body>
<main>
<h1>Page</h1>
${body}
</main>
</body>
</html>
`

const strippedEnv = () => {
  const env = { ...process.env }
  delete env.CI
  delete env.WORKERS_CI
  delete env.PRIVATE_TERMS
  return env
}

const runChecker = (dir: string) =>
  spawnSync(
    process.execPath,
    ['--import', 'tsx', 'scripts/check-site.ts', dir],
    {
      cwd: repoRoot,
      env: strippedEnv(),
      encoding: 'utf8'
    }
  )

const buildSite = (dir: string) =>
  spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      'node_modules/@11ty/eleventy/cmd.cjs',
      '--config=eleventy.config.ts',
      '--input=src',
      `--output=${dir}`
    ],
    { cwd: repoRoot, env: strippedEnv(), encoding: 'utf8' }
  )

describe('check-site runner', () => {
  const dirs: string[] = []

  afterEach(async () => {
    await Promise.all(
      dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))
    )
  })

  it('exits 1 and prints one file: problem line per broken link and contact address', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'build-gate-'))
    dirs.push(dir)
    await mkdir(join(dir, 'about'))
    await writeFile(
      join(dir, 'index.html'),
      page('<p><a href="/missing-page/">Gone</a></p>')
    )
    await writeFile(
      join(dir, 'about', 'index.html'),
      page('<p><a href="/">Home</a></p>')
    )
    await writeFile(
      join(dir, 'contact.txt'),
      'Write to reachoutto@michaelmoser.dev\n'
    )

    const result = runChecker(dir)

    const errorLines = result.stderr
      .split('\n')
      .filter((line) => line.trim() !== '' && !/denylist/i.test(line))
    expect(result.status).toBe(1)
    expect(errorLines).toHaveLength(2)
    expect(errorLines).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^index\.html: .*\/missing-page\//),
        expect.stringMatching(/^contact\.txt: /)
      ])
    )
  })

  it('exits 0 for the real site built from src', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'build-gate-'))
    dirs.push(dir)

    const build = buildSite(dir)
    expect(build.status, build.stderr).toBe(0)

    const result = runChecker(dir)

    expect(result.status, result.stderr).toBe(0)
  }, 60000)
})
