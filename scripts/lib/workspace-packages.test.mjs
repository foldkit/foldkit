import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import {
  assertCompleteReleaseSet,
  publicWorkspacePackages,
  readWorkspacePackages,
  workspacePackagesFromEntries,
} from './workspace-packages.mjs'

const writePackage = (root, dir, packageJson) => {
  const packageDir = join(root, dir)
  mkdirSync(packageDir, { recursive: true })
  writeFileSync(
    join(packageDir, 'package.json'),
    `${JSON.stringify(packageJson)}\n`,
  )
  return { path: dir }
}

test('discovers the public release set from workspace manifests', () => {
  const root = mkdtempSync(join(tmpdir(), 'foldkit-workspaces-'))
  try {
    const entries = [
      writePackage(root, 'packages/alpha', {
        name: '@foldkit/alpha',
        version: '1.0.0',
      }),
      writePackage(root, 'packages/private', {
        name: '@foldkit/private',
        version: '1.0.0',
        private: true,
      }),
    ]
    const packages = workspacePackagesFromEntries(root, entries)

    assert.deepEqual(
      publicWorkspacePackages(packages).map(pkg => pkg.packageJson.name),
      ['@foldkit/alpha'],
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('rejects a coherent set that omits a public workspace package', () => {
  const packages = [
    { packageJson: { name: 'foldkit' } },
    { packageJson: { name: '@foldkit/ui' } },
  ]

  assert.throws(
    () => assertCompleteReleaseSet(packages, packages.slice(0, 1)),
    /missing public packages: @foldkit\/ui/,
  )
})

test('workspace discovery does not expose npm OTP values to pnpm', () => {
  const root = mkdtempSync(join(tmpdir(), 'foldkit-workspaces-'))

  try {
    const entries = [
      writePackage(root, 'packages/alpha', {
        name: '@foldkit/alpha',
        version: '1.0.0',
      }),
    ]
    const calls = []
    const packages = readWorkspacePackages(root, {
      env: {
        FOLDKIT_PNPM_EXECUTABLE: '/usr/bin/pnpm',
        NPM_CONFIG_OTP: 'uppercase-secret',
        npm_config_otp: 'lowercase-secret',
        PATH: '/usr/bin',
      },
      run: (command, args, options) => {
        calls.push({ command, args, options })

        return {
          status: 0,
          stdout: JSON.stringify(entries),
          stderr: '',
        }
      },
    })

    assert.deepEqual(
      packages.map(pkg => pkg.packageJson.name),
      ['@foldkit/alpha'],
    )
    assert.deepEqual(calls, [
      {
        command: '/usr/bin/pnpm',
        args: ['ls', '-r', '--depth', '-1', '--json'],
        options: {
          cwd: root,
          encoding: 'utf8',
          env: {
            FOLDKIT_PNPM_EXECUTABLE: '/usr/bin/pnpm',
            PATH: '/usr/bin',
          },
        },
      },
    ])
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
