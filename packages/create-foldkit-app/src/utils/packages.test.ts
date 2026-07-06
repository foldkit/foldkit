import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import {
  buildUnresolvedDeps,
  buildUnresolvedDevDeps,
  devCommand,
  installCommand,
} from './packages.js'

describe('buildUnresolvedDeps', () => {
  it('keeps third-party versions, resolves Foldkit workspace deps to latest, and drops foreign workspace deps', () => {
    const result = buildUnresolvedDeps({
      effect: '4.0.0-beta.88',
      '@effect/platform-browser': '4.0.0-beta.88',
      foldkit: 'workspace:*',
      '@foldkit/ui': 'workspace:*',
      tailwindcss: '^4.3.1',
      'some-internal-package': 'workspace:*',
    })

    expect(result).toEqual({
      effect: { _tag: 'Keep', version: '4.0.0-beta.88' },
      '@effect/platform-browser': { _tag: 'Keep', version: '4.0.0-beta.88' },
      foldkit: { _tag: 'Latest' },
      '@foldkit/ui': { _tag: 'Latest' },
      tailwindcss: { _tag: 'Keep', version: '^4.3.1' },
    })
  })
})

describe('buildUnresolvedDevDeps', () => {
  it('merges template tooling with the example, letting concrete example versions win over the template latest marker', () => {
    const result = buildUnresolvedDevDeps({
      prettier: '^3.8.4',
      typescript: '^6.0.3',
      vite: '^8.0.16',
      '@foldkit/vite-plugin': 'workspace:*',
    })

    expect(result).toEqual({
      '@foldkit/vite-plugin': { _tag: 'Latest' },
      '@foldkit/devtools-mcp': { _tag: 'Latest' },
      '@foldkit/oxlint-plugin': { _tag: 'Latest' },
      '@trivago/prettier-plugin-sort-imports': { _tag: 'Latest' },
      'happy-dom': { _tag: 'Latest' },
      oxlint: { _tag: 'Latest' },
      prettier: { _tag: 'Keep', version: '^3.8.4' },
      vitest: { _tag: 'Latest' },
      typescript: { _tag: 'Keep', version: '^6.0.3' },
      vite: { _tag: 'Keep', version: '^8.0.16' },
    })
  })
})

describe('installCommand', () => {
  it('installs with the selected package manager', () => {
    expect(installCommand('pnpm')).toBe('pnpm install')
    expect(installCommand('npm')).toBe('npm install')
    expect(installCommand('yarn')).toBe('yarn install')
    expect(installCommand('bun')).toBe('bun install')
  })
})

describe('devCommand', () => {
  it('runs the dev script, prefixing run only where npm needs it', () => {
    expect(devCommand('pnpm')).toBe('pnpm dev')
    expect(devCommand('npm')).toBe('npm run dev')
    expect(devCommand('yarn')).toBe('yarn dev')
    expect(devCommand('bun')).toBe('bun dev')
  })
})
