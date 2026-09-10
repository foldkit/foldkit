import { readFileSync, writeFileSync } from 'node:fs'

// NOTE: Do not add Foldkit peers with real minimums to this list. Resetting one
// to `workspace:^0` would let the package install with an older Foldkit that
// does not export an API the package uses. Changesets leaves their plain semver
// ranges alone, and `check-peer-floors.ts` checks the packed manifests.
const TARGETS = [
  { path: 'packages/devtools/package.json', dep: '@foldkit/ui' },
] as const

const BROAD_RANGE = 'workspace:^0'

for (const target of TARGETS) {
  const raw = readFileSync(target.path, 'utf8')
  const pkg = JSON.parse(raw) as {
    peerDependencies?: Record<string, string>
  }

  const current = pkg.peerDependencies?.[target.dep]
  if (current === undefined) {
    continue
  }
  if (current === BROAD_RANGE) {
    continue
  }

  pkg.peerDependencies![target.dep] = BROAD_RANGE
  writeFileSync(target.path, JSON.stringify(pkg, null, 2) + '\n')
  console.log(
    `Reset ${target.dep} peer dep in ${target.path}: ${current} -> ${BROAD_RANGE}`,
  )
}
