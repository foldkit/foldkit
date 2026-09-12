import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  sharedPackageInputsDiffer,
  WEBSITE_PACKAGES,
} from './lib/website-package-inputs.mjs'

const CHANGESET_PATH = '.changeset/generated-website-build-inputs.md'
const CHANGESET = [
  '---',
  ...WEBSITE_PACKAGES.map(pkg => `'${pkg.name}': patch`),
  '---',
  '',
  "Rebuild with the release's shared tooling configuration so the published packages and website use the same build inputs.",
  '',
].join('\n')

const git = args =>
  spawnSync('git', args, { cwd: process.cwd(), encoding: 'utf8' })

const main = () => {
  const changesetPath = resolve(CHANGESET_PATH)
  const isExistingChangeset = existsSync(changesetPath)

  if (
    isExistingChangeset &&
    readFileSync(changesetPath, 'utf8') !== CHANGESET
  ) {
    throw new Error(`${CHANGESET_PATH} already exists with different contents`)
  }

  const publishedTagCommits = WEBSITE_PACKAGES.map(pkg => {
    const manifestPath = `${pkg.directory}/package.json`
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

    if (manifest.name !== pkg.name || typeof manifest.version !== 'string') {
      throw new Error(`${manifestPath} does not describe ${pkg.name}`)
    }

    const tag = `${pkg.name}@${manifest.version}`
    const result = git(['rev-parse', '--verify', `refs/tags/${tag}^{commit}`])

    if (result.status !== 0) {
      throw new Error(
        `${tag} has no release tag. Fetch the release history and finish the current release before preparing another.`,
      )
    }

    return result.stdout.trim()
  })

  if (sharedPackageInputsDiffer({ git, publishedTagCommits })) {
    if (!isExistingChangeset) {
      writeFileSync(changesetPath, CHANGESET, { flag: 'wx' })
    }

    console.log(
      'Included website package patch bumps for changed shared build inputs.',
    )
  } else {
    if (isExistingChangeset) {
      unlinkSync(changesetPath)
    }

    console.log(
      'Shared build inputs are already covered by the published website packages.',
    )
  }
}

try {
  main()
} catch (error) {
  console.error(
    `[website-release] ${error instanceof Error ? error.message : String(error)}`,
  )
  process.exitCode = 1
}
