import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, renameSync } from 'node:fs'
import { join } from 'node:path'

const tree = '/private/tmp/foldkit-html-definition-twins-20261107/candidate'
const node = '/Users/devinjameson/.vite-plus/js_runtime/node/26.13.0/bin/node'
const dependencyRoot = '/Users/devinjameson/.codex/worktrees/block-completion-record/foldkit-unified-recovery-20261103/node_modules/.pnpm'
const rimraf = join(dependencyRoot, 'rimraf@6.1.3/node_modules/rimraf/dist/esm/bin.mjs')
const vite = join(dependencyRoot, 'vite@8.3.5_@types+node@26.4.0_jiti@2.7.0_yaml@2.9.1/node_modules/vite/bin/vite.js')
const cwd = join(tree, 'internal/lustre-benchmark')
const commonEnv = { ...process.env }
delete commonEnv.NODE_ENV
delete commonEnv.VITE_USER_NODE_ENV
delete commonEnv.MODE
delete commonEnv.BUILD_VARIANT
Object.assign(commonEnv, { CI: '1', LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8', NO_COLOR: '1' })

const run = (args, env = commonEnv) => execFileSync(node, args, { cwd, env, stdio: 'inherit' })
run([rimraf, 'dist'])
run([vite, 'build', '--mode', 'production'])
run([vite, 'build', '--mode', 'production'], { ...commonEnv, BUILD_VARIANT: 'optimised' })
const source = join(cwd, 'dist/optimised/index.optimised.html')
const target = join(cwd, 'dist/optimised/index.html')
assert(existsSync(source), source)
renameSync(source, target)
