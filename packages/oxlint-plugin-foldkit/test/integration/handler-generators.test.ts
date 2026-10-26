import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildPlugin } from './build-plugin.ts'
import { runOxlint } from './run-oxlint.ts'

const here = dirname(fileURLToPath(import.meta.url))
const pluginRoot = join(here, '..', '..')
const repoRoot = join(pluginRoot, '..', '..')
const oxlintBin = join(repoRoot, 'node_modules', 'oxlint', 'bin', 'oxlint')
const workDir = mkdtempSync(join(tmpdir(), 'foldkit-handler-generators-'))
const bundlePath = join(workDir, 'plugin.mjs')
const configPath = join(workDir, '.oxlintrc.json')
const consumerConfigPath = join(workDir, 'consumer.oxlintrc.json')
const fixturePath = join(workDir, 'command.ts')

beforeAll(async () => {
  await buildPlugin(bundlePath)

  const { default: plugin } = await import(pathToFileURL(bundlePath).href)
  writeFileSync(
    configPath,
    JSON.stringify({
      ...plugin.configs.recommended,
      jsPlugins: [
        { name: 'foldkit', specifier: pathToFileURL(bundlePath).href },
      ],
    }),
  )
  writeFileSync(
    consumerConfigPath,
    JSON.stringify({
      ...plugin.configs.recommended,
      jsPlugins: [
        { name: 'foldkit', specifier: pathToFileURL(bundlePath).href },
      ],
      rules: {
        ...plugin.configs.recommended.rules,
        'require-yield': 'error',
      },
    }),
  )
  writeFileSync(
    fixturePath,
    `
const FetchPosts = {
  handler: function* () {
    return () => Promise.resolve('posts')
  },
}

void FetchPosts
`,
  )
})

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true })
})

describe('recommended preset handler generators', () => {
  it('allows constructors that have no service lookup', () => {
    expect(
      runOxlint({
        oxlintBin,
        cwd: workDir,
        configPath,
        target: fixturePath,
      }),
    ).toEqual([])
  })

  it('allows consumers to re-enable require-yield', () => {
    const diagnostics = runOxlint({
      oxlintBin,
      cwd: workDir,
      configPath: consumerConfigPath,
      target: fixturePath,
    })

    expect(diagnostics.map(diagnostic => diagnostic.code)).toEqual([
      'eslint(require-yield)',
    ])
  })
})
