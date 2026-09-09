import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// A peer range that names a real minimum, checked against the manifest npm will
// actually publish rather than the one in the repository. `changeset version`
// runs `reset-peer-deps`, and `pnpm pack` rewrites `workspace:` ranges, so a
// floor can be correct in the source tree and gone from the tarball. That is how
// `@foldkit/vite-plugin@0.15.0` shipped a `^0` peer that accepts a foldkit
// without the `foldkit/experimental/server` export the plugin imports.
const FLOORS = [
  {
    packageDir: 'packages/ui',
    packageName: '@foldkit/ui',
    dependency: 'foldkit',
    minimum: '0.155.0',
    safePackageVersion: '0.155.0',
  },
  {
    packageDir: 'packages/devtools',
    packageName: '@foldkit/devtools',
    dependency: 'foldkit',
    minimum: '0.153.0',
    safePackageVersion: '0.153.0',
  },
  {
    packageDir: 'packages/devtools-mcp',
    packageName: '@foldkit/devtools-mcp',
    dependency: 'foldkit',
    minimum: '0.153.0',
    safePackageVersion: '0.19.0',
  },
  {
    packageDir: 'packages/markdown',
    packageName: '@foldkit/markdown',
    dependency: 'foldkit',
    minimum: '0.153.0',
    safePackageVersion: '0.8.0',
  },
  {
    packageDir: 'packages/vite-plugin-foldkit',
    packageName: '@foldkit/vite-plugin',
    dependency: 'foldkit',
    minimum: '0.153.0',
    safePackageVersion: '0.19.0',
  },
] as const

type PackedManifest = Readonly<{
  name: string
  version: string
  peerDependencies?: Readonly<Record<string, string>>
}>

const packedManifest = (packageDir: string): PackedManifest => {
  const outputDir = mkdtempSync(join(tmpdir(), 'foldkit-pack-'))
  try {
    const packed = execFileSync(
      'pnpm',
      ['pack', '--pack-destination', outputDir],
      { cwd: packageDir, encoding: 'utf8' },
    )
    const tarball = packed.trim().split('\n').at(-1)
    if (tarball === undefined) {
      throw new Error(`pnpm pack produced no tarball for ${packageDir}`)
    }
    const manifest = execFileSync(
      'tar',
      ['-xzOf', tarball, 'package/package.json'],
      { encoding: 'utf8' },
    )
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    return JSON.parse(manifest) as PackedManifest
  } finally {
    rmSync(outputDir, { recursive: true, force: true })
  }
}

const parseVersion = (value: string): ReadonlyArray<number> =>
  value.split('.').map(part => Number.parseInt(part, 10))

const isAtLeast = (
  candidate: ReadonlyArray<number>,
  minimum: ReadonlyArray<number>,
): boolean => {
  for (let index = 0; index < minimum.length; index += 1) {
    const left = candidate[index] ?? 0
    const right = minimum[index] ?? 0
    if (left !== right) {
      return left > right
    }
  }
  return true
}

const failures: Array<string> = []

const hasPendingSafeBump = (packageName: string): boolean =>
  readdirSync('.changeset')
    .filter(fileName => fileName.endsWith('.md') && fileName !== 'README.md')
    .some(fileName => {
      const contents = readFileSync(`.changeset/${fileName}`, 'utf8')
      const escapedName = packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return new RegExp(
        `^[\"']?${escapedName}[\"']?:\\s*(?:minor|major)\\s*$`,
        'm',
      ).test(contents)
    })

for (const floor of FLOORS) {
  const manifest = packedManifest(floor.packageDir)
  const range = manifest.peerDependencies?.[floor.dependency]

  if (range === undefined) {
    failures.push(
      `${floor.packageName} packs without a ${floor.dependency} peer dependency, so nothing holds it to ${floor.minimum} or newer.`,
    )
    continue
  }

  const match = /^>=\s*(\d+\.\d+\.\d+)$/.exec(range)
  if (match?.[1] === undefined) {
    failures.push(
      `${floor.packageName} packs "${floor.dependency}": "${range}". It must be a ">=" range naming the minimum that ships the API the package imports, not a broad range a release script rewrote.`,
    )
    continue
  }

  if (!isAtLeast(parseVersion(match[1]), parseVersion(floor.minimum))) {
    failures.push(
      `${floor.packageName} packs "${floor.dependency}": "${range}", below the required floor of ${floor.minimum}.`,
    )
  }

  if (
    !isAtLeast(
      parseVersion(manifest.version),
      parseVersion(floor.safePackageVersion),
    ) &&
    !hasPendingSafeBump(floor.packageName)
  ) {
    failures.push(
      `${floor.packageName}@${manifest.version} raises its ${floor.dependency} floor but has neither reached ${floor.safePackageVersion} nor declared a pending minor release. Publishing this as a patch would break existing pre-1.0 caret ranges.`,
    )
  }
}

if (failures.length > 0) {
  console.error('Packed peer dependency floors are wrong:\n')
  for (const failure of failures) {
    console.error(`  ${failure}`)
  }
  console.error(
    '\nCheck the pending changeset and scripts/reset-peer-deps.ts before publishing.',
  )
  process.exit(1)
}

console.log(`Packed peer dependency floors hold for ${FLOORS.length} packages.`)
