export const WEBSITE_PACKAGES = [
  { directory: 'packages/foldkit', name: 'foldkit' },
  { directory: 'packages/ui', name: '@foldkit/ui' },
  { directory: 'packages/devtools', name: '@foldkit/devtools' },
  { directory: 'packages/markdown', name: '@foldkit/markdown' },
  {
    directory: 'packages/vite-plugin-foldkit',
    name: '@foldkit/vite-plugin',
  },
]

export const SHARED_PACKAGE_INPUTS = [
  '.npmrc',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'tsconfig.base.json',
]

export const packageBuildInputs = directory => [
  directory,
  `:(exclude,glob)${directory}/**/*.test.*`,
  `:(exclude,glob)${directory}/**/*.spec.*`,
  `:(exclude,glob)${directory}/test/**`,
  `:(exclude,glob)${directory}/**/__snapshots__/**`,
  `:(exclude,glob)${directory}/vitest.config.*`,
  `:(exclude,glob)${directory}/tsconfig.test.*`,
]
