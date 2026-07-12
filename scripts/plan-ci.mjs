import { spawnSync } from 'node:child_process'

const [baseSha, headSha, ...providedChangedFiles] = process.argv.slice(2)
const isChangedFileListProvided = providedChangedFiles.at(0) !== undefined
const isUnknownBase =
  !baseSha || !headSha || /^0+$/.test(baseSha) || /^0+$/.test(headSha)
const diffResult =
  isUnknownBase || isChangedFileListProvided
    ? undefined
    : spawnSync('git', ['diff', '--name-only', '-z', baseSha, headSha], {
        encoding: 'utf8',
      })
const changedFiles = isChangedFileListProvided
  ? providedChangedFiles
  : diffResult?.status === 0
    ? diffResult.stdout.split('\0').filter(fileName => fileName !== '')
    : []
const isUnknownDiff =
  !isChangedFileListProvided && (isUnknownBase || diffResult?.status !== 0)

const hasChanged = ({ files = [], prefixes = [] }) =>
  isUnknownDiff ||
  changedFiles.some(
    fileName =>
      files.includes(fileName) ||
      prefixes.some(prefix => fileName.startsWith(prefix)),
  )

const createFoldkitSmoke = hasChanged({
  files: [
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'scripts/check-create-foldkit-app-smoke.ts',
  ],
  prefixes: ['packages/create-foldkit-app/', 'packages/oxlint-plugin-foldkit/'],
})
const typingGame = hasChanged({
  files: ['scripts/check-circular-deps.sh'],
  prefixes: [
    'packages/typing-game/client/',
    'packages/typing-game/server/',
    'packages/typing-game/shared/',
    'packages/foldkit/',
    'packages/devtools/',
    'packages/vite-plugin-foldkit/',
  ],
})
const website = hasChanged({
  files: ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml'],
  prefixes: [
    'packages/website/',
    'packages/foldkit/',
    'packages/ui/',
    'packages/devtools/',
    'packages/vite-plugin-foldkit/',
  ],
})
const fullWorkspaceChecks = hasChanged({
  files: [
    '.github/workflows/ci.yml',
    '.npmrc',
    'examples/vite.aliases.ts',
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'scripts/plan-ci.mjs',
    'tsconfig.base.json',
  ],
})
const workspacePackages = hasChanged({
  files: [
    '.github/workflows/ci.yml',
    '.npmrc',
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'scripts/plan-ci.mjs',
    'tsconfig.base.json',
  ],
  prefixes: ['comparisons/', 'examples/', 'internal/', 'packages/'],
})

process.stdout.write(`create_foldkit_smoke=${createFoldkitSmoke}\n`)
process.stdout.write(`typing_game=${typingGame}\n`)
process.stdout.write(`website=${website}\n`)
process.stdout.write(`full_workspace_checks=${fullWorkspaceChecks}\n`)
process.stdout.write(`workspace_packages=${workspacePackages}\n`)
