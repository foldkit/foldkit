import { FileSystem } from '@effect/platform'
import { NodeContext, NodeRuntime } from '@effect/platform-node'
import { Console, Effect } from 'effect'

const TARGETS = [
  { path: 'packages/vite-plugin-foldkit/package.json', dep: 'foldkit' },
  { path: 'packages/devtools-mcp/package.json', dep: 'foldkit' },
] as const

const BROAD_RANGE = 'workspace:^0'

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem

  for (const target of TARGETS) {
    const raw = yield* fs.readFileString(target.path)
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
    yield* fs.writeFileString(target.path, JSON.stringify(pkg, null, 2) + '\n')
    yield* Console.log(
      `Reset ${target.dep} peer dep in ${target.path}: ${current} -> ${BROAD_RANGE}`,
    )
  }
})

NodeRuntime.runMain(program.pipe(Effect.provide(NodeContext.layer)))
