import { mkdirSync, realpathSync, rmSync, symlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const fixture = dirname(fileURLToPath(import.meta.url))
const repository = resolve(fixture, '../../..')
rmSync(join(fixture, 'node_modules'), { recursive: true, force: true })

for (const [name, target] of Object.entries({
  foldkit: 'packages/foldkit',
  effect: 'node_modules/effect',
  vitest: 'packages/foldkit/node_modules/vitest',
  'happy-dom': 'packages/foldkit/node_modules/happy-dom',
  '@types': 'node_modules/@types',
})) {
  const destination = join(fixture, 'node_modules', name)
  mkdirSync(dirname(destination), { recursive: true })
  symlinkSync(realpathSync(join(repository, target)), destination, 'dir')
}
