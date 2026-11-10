import { cpSync, mkdirSync, readdirSync, rmSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'
import type { BuildResult } from '@11ty/eleventy'
import { register } from 'tsx/esm/api'

const root = join(import.meta.dirname, '..')

interface ScenarioOptions {
  env?: Record<string, string>
  runMode?: 'build' | 'serve'
}

interface ScenarioOutcome {
  results?: BuildResult[]
  error?: Error
  warnings: string[]
}

let registered = false

async function loadEleventy() {
  if (!registered) {
    register({
      tsconfig: join(import.meta.dirname, 'scenarios.tsconfig.json')
    })
    registered = true
  }
  const { default: Eleventy } = await import('@11ty/eleventy')
  return Eleventy
}

function linkLib() {
  const scenariosDir = join(root, 'test', '.scenarios')
  mkdirSync(scenariosDir, { recursive: true })
  try {
    symlinkSync(join(root, 'lib'), join(scenariosDir, 'lib'), 'dir')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
  }
}

function assemble(name: string) {
  linkLib()
  const scenarioDir = join(root, 'test', '.scenarios', name)
  const fixtureDir = join(root, 'test', 'fixtures', name)
  rmSync(scenarioDir, { recursive: true, force: true })
  cpSync(join(root, 'src'), scenarioDir, { recursive: true })
  mkdirSync(join(scenarioDir, 'writing'), { recursive: true })
  for (const entry of readdirSync(fixtureDir)) {
    const target = entry === '_data' ? '_data' : join('writing', entry)
    cpSync(join(fixtureDir, entry), join(scenarioDir, target), {
      recursive: true
    })
  }
  return join('test', '.scenarios', name)
}

function applyEnv(env: Record<string, string | undefined>) {
  const previous = new Map<string, string | undefined>()
  for (const [key, value] of Object.entries(env)) {
    previous.set(key, process.env[key])
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  return () => {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

export async function buildScenario(
  name: string,
  options: ScenarioOptions = {}
): Promise<ScenarioOutcome> {
  const input = assemble(name)
  const Eleventy = await loadEleventy()
  const warnings: string[] = []
  const originalWarn = console.warn
  const restoreEnv = applyEnv({
    CI: undefined,
    WORKERS_CI: undefined,
    ELEVENTY_RUN_MODE: undefined,
    ...options.env
  })
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(' '))
  }
  try {
    const eleventyOptions = {
      ...(options.runMode ? { runMode: options.runMode } : {}),
      configPath: 'eleventy.config.ts',
      config: (eleventyConfig: { setUseGitIgnore(value: boolean): void }) => {
        eleventyConfig.setUseGitIgnore(false)
      }
    }
    const results = await new Eleventy(
      input,
      join(input, '_out'),
      eleventyOptions
    ).toJSON()
    return { results, warnings }
  } catch (error) {
    return { error: error as Error, warnings }
  } finally {
    console.warn = originalWarn
    restoreEnv()
  }
}
