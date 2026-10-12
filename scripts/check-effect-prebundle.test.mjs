import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

const SCRIPT = join(import.meta.dirname, 'check-effect-prebundle.ts')
const FIXTURES = join(import.meta.dirname, 'fixtures/effect-prebundle')

const makeWorkspace = context => {
  const workspace = mkdtempSync(join(tmpdir(), 'foldkit-effect-prebundle-'))
  context.after(() => rmSync(workspace, { recursive: true, force: true }))

  const source = join(workspace, 'packages/foldkit/src')
  const plugin = join(workspace, 'packages/vite-plugin-foldkit/src')
  mkdirSync(source, { recursive: true })
  mkdirSync(plugin, { recursive: true })

  copyFileSync(join(FIXTURES, 'production.ts'), join(source, 'main.ts'))
  copyFileSync(join(FIXTURES, 'plugin.ts'), join(plugin, 'index.ts'))

  return { workspace, source }
}

const runCheck = workspace =>
  spawnSync(process.execPath, [SCRIPT], { cwd: workspace, encoding: 'utf8' })

test('ignores Effect namespaces in excluded test sources', context => {
  const { workspace, source } = makeWorkspace(context)
  copyFileSync(join(FIXTURES, 'test.ts'), join(source, 'main.test.ts'))

  const result = runCheck(workspace)

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /1 namespaces verified/)
})

test('reports missing Effect namespaces in published sources', context => {
  const { workspace, source } = makeWorkspace(context)
  copyFileSync(join(FIXTURES, 'test.ts'), join(source, 'deferred.ts'))

  const result = runCheck(workspace)

  assert.equal(result.status, 1, result.stdout)
  assert.match(result.stderr, /'effect\/Deferred'/)
})
