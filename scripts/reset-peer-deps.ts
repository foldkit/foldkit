import { readFileSync, writeFileSync } from 'node:fs'

const TARGETS = [
  { path: 'packages/vite-plugin-foldkit/package.json', dep: 'foldkit' },
  { path: 'packages/devtools-mcp/package.json', dep: 'foldkit' },
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
