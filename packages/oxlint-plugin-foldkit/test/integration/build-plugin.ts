import { symlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'rolldown'

import config from '../../rolldown.config.ts'

const here = dirname(fileURLToPath(import.meta.url))
const pluginRoot = join(here, '..', '..')

export const buildPlugin = async (bundlePath: string): Promise<void> => {
  const { output } = config

  if (globalThis.Array.isArray(output)) {
    throw new Error('The integration plugin requires one bundle output')
  }

  symlinkSync(
    join(pluginRoot, 'node_modules'),
    join(dirname(bundlePath), 'node_modules'),
    'dir',
  )

  await build({
    ...config,
    cwd: pluginRoot,
    output: { ...output, file: bundlePath },
  })
}
