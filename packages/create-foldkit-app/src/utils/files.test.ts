import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { applyPackageManager } from './files.js'

const templateReadme = readFileSync(
  fileURLToPath(new URL('../../templates/base/README.md', import.meta.url)),
  'utf8',
)

describe('applyPackageManager', () => {
  it('substitutes the README command placeholders for the selected manager', () => {
    const bun = applyPackageManager(templateReadme, 'bun')
    expect(bun).toContain('bun install')
    expect(bun).toContain('bun dev')
    expect(bun).not.toContain('{{')

    const npm = applyPackageManager(templateReadme, 'npm')
    expect(npm).toContain('npm install')
    expect(npm).toContain('npm run dev')
    expect(npm).not.toContain('{{')

    const pnpm = applyPackageManager(templateReadme, 'pnpm')
    expect(pnpm).toContain('pnpm install')
    expect(pnpm).toContain('pnpm dev')
    expect(pnpm).not.toContain('{{')
  })
})
