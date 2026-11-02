import assert from 'node:assert/strict'
import { realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const fixture = dirname(fileURLToPath(import.meta.url))
const repository = resolve(fixture, '../../..')
const runtimes = [
  fixture,
  resolve(repository, 'packages/foldkit'),
  resolve(repository, 'packages/ui'),
  resolve(repository, 'packages/vite-plugin-foldkit'),
].map(directory => ({
  directory,
  effect: realpathSync(
    createRequire(resolve(directory, 'package.json')).resolve('effect'),
  ),
}))

assert.equal(
  new Set(runtimes.map(runtime => runtime.effect)).size,
  1,
  `The chat and its framework packages must share one Effect runtime:\n${JSON.stringify(runtimes, null, 2)}`,
)

console.log(JSON.stringify(runtimes, null, 2))
