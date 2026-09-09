import { resolveChangedFiles } from './lib/changed-files.mjs'

const { changedFiles, isUnknownDiff } = resolveChangedFiles(
  process.argv.slice(2),
)

const hasChanged = ({ files = [], prefixes = [] }) =>
  isUnknownDiff ||
  changedFiles.some(
    fileName =>
      files.includes(fileName) ||
      prefixes.some(prefix => fileName.startsWith(prefix)),
  )

// NOTE: a workspace-wide change implies every application scope below. Root
// config such as tsconfig.base.json or .npmrc can break a bundle or an install
// while `tsc --noEmit` stays green, so the builds must not be skipped just
// because no package directory was touched.
const fullWorkspaceChecks = hasChanged({
  files: [
    '.github/workflows/ci.yml',
    '.npmrc',
    'examples/vite.aliases.ts',
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'scripts/build-public-packages.mjs',
    'scripts/lib/changed-files.mjs',
    'scripts/lib/workspace-packages.mjs',
    'scripts/plan-ci.mjs',
    'tsconfig.base.json',
  ],
})
const createFoldkitSmoke =
  fullWorkspaceChecks ||
  hasChanged({
    files: ['scripts/check-create-foldkit-app-smoke.ts'],
    prefixes: [
      'packages/create-foldkit-app/',
      'packages/oxlint-plugin-foldkit/',
    ],
  })
const packedSsrConsumer =
  fullWorkspaceChecks ||
  hasChanged({
    files: [
      'examples/ssr/package.json',
      'packages/examples-e2e/package.json',
      'scripts/check-packed-ssr-consumer.ts',
    ],
    prefixes: [
      'packages/foldkit/',
      'packages/vite-plugin-foldkit/',
      'scripts/fixtures/packed-ssr-consumer/',
    ],
  })
const hostParity =
  fullWorkspaceChecks ||
  hasChanged({
    files: ['scripts/check-host-parity.ts'],
    prefixes: [
      'examples/ssr/',
      'packages/foldkit/',
      'packages/vite-plugin-foldkit/',
      'scripts/fixtures/host-parity/',
    ],
  })
const scaffoldServerRendering =
  fullWorkspaceChecks ||
  hasChanged({
    files: [
      'examples/ssg/package.json',
      'examples/ssr/package.json',
      'packages/examples-e2e/package.json',
      'scripts/check-scaffold-server-rendering.ts',
    ],
    prefixes: [
      'packages/create-foldkit-app/',
      'packages/devtools/',
      'packages/devtools-mcp/',
      'packages/foldkit/',
      'packages/oxlint-plugin-foldkit/',
      'packages/ui/',
      'packages/vite-plugin-foldkit/',
    ],
  })
const domStateParity =
  fullWorkspaceChecks ||
  hasChanged({
    files: [
      'packages/examples-e2e/package.json',
      'scripts/check-dom-state-parity.mts',
    ],
    prefixes: ['packages/foldkit/'],
  })
const prerenderRepeatable =
  fullWorkspaceChecks ||
  hasChanged({
    files: ['scripts/check-prerender-repeatable.ts'],
    prefixes: [
      'examples/ssg/',
      'packages/create-foldkit-app/templates/rendering/ssg/',
      'packages/foldkit/',
      'packages/vite-plugin-foldkit/',
    ],
  })
const peerFloors =
  fullWorkspaceChecks ||
  hasChanged({
    files: [
      'packages/vite-plugin-foldkit/package.json',
      'scripts/check-peer-floors.ts',
      'scripts/reset-peer-deps.ts',
    ],
    prefixes: ['.changeset/'],
  })
const typingGame =
  fullWorkspaceChecks ||
  hasChanged({
    prefixes: [
      'packages/typing-game/client/',
      'packages/typing-game/server/',
      'packages/typing-game/shared/',
      'packages/foldkit/',
      'packages/devtools/',
      'packages/vite-plugin-foldkit/',
    ],
  })
const website =
  fullWorkspaceChecks ||
  hasChanged({
    files: [
      '.github/workflows/deploy-website-build.yml',
      '.github/workflows/deploy-website-canary.yml',
      '.github/workflows/deploy-website.yml',
      '.github/workflows/release.yml',
      'scripts/build-examples.ts',
      'scripts/check-playground-ssg-build.ts',
      'scripts/example-bridge.js',
      'scripts/lib/package-version.d.mts',
      'scripts/lib/package-version.mjs',
      'scripts/website-vercel-config.mjs',
    ],
    prefixes: [
      'examples/',
      'packages/website/',
      'packages/foldkit/',
      'packages/ui/',
      'packages/devtools/',
      'packages/markdown/',
      'packages/vite-plugin-foldkit/',
    ],
  })
const workspacePackages = hasChanged({
  files: [
    '.github/workflows/ci.yml',
    '.npmrc',
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'scripts/lib/changed-files.mjs',
    'scripts/plan-ci.mjs',
    'tsconfig.base.json',
  ],
  prefixes: ['comparisons/', 'examples/', 'internal/', 'packages/'],
})

process.stdout.write(`create_foldkit_smoke=${createFoldkitSmoke}\n`)
process.stdout.write(`packed_ssr_consumer=${packedSsrConsumer}\n`)
process.stdout.write(`scaffold_server_rendering=${scaffoldServerRendering}\n`)
process.stdout.write(`host_parity=${hostParity}\n`)
process.stdout.write(`dom_state_parity=${domStateParity}\n`)
process.stdout.write(`prerender_repeatable=${prerenderRepeatable}\n`)
process.stdout.write(`peer_floors=${peerFloors}\n`)
process.stdout.write(`typing_game=${typingGame}\n`)
process.stdout.write(`website=${website}\n`)
process.stdout.write(`full_workspace_checks=${fullWorkspaceChecks}\n`)
process.stdout.write(`workspace_packages=${workspacePackages}\n`)
