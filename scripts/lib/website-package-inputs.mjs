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

export const sharedPackageInputsDiffer = ({
  git,
  publishedTagCommits,
  target,
}) => {
  if (publishedTagCommits.length === 0) {
    return false
  }

  if (target === undefined) {
    const untracked = git([
      'ls-files',
      '--others',
      '--exclude-standard',
      '--',
      ...SHARED_PACKAGE_INPUTS,
    ])

    if (untracked.status !== 0) {
      throw new Error(
        untracked.stderr.trim() || 'could not list new shared package inputs',
      )
    }

    if (untracked.stdout.trim() !== '') {
      return true
    }
  }

  const latestRelease = git(['rev-list', '-1', ...publishedTagCommits])
  if (latestRelease.status !== 0) {
    throw new Error(
      latestRelease.stderr.trim() ||
        'could not identify the latest published website package release',
    )
  }

  const result = git([
    'diff',
    '--quiet',
    latestRelease.stdout.trim(),
    ...(target === undefined ? [] : [target]),
    '--',
    ...SHARED_PACKAGE_INPUTS,
  ])

  if (result.status === 0) {
    return false
  }
  if (result.status === 1) {
    return true
  }

  throw new Error(
    result.stderr.trim() || 'could not compare shared package inputs',
  )
}
