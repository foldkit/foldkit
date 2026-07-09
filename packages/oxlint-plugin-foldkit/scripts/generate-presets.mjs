import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const { default: plugin } = await import(join(root, 'dist', 'index.js'))

const write = (name, config) =>
  writeFileSync(join(root, name), JSON.stringify(config, null, 2) + '\n')

write('recommended.json', plugin.configs.recommended)
write('all.json', plugin.configs.all)
