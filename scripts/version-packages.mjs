import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { basename, dirname, resolve } from 'node:path'

import {
  SHARED_PACKAGE_INPUTS,
  sharedPackageInputsDiffer,
} from './lib/website-package-inputs.mjs'
import { readWorkspacePackages } from './lib/workspace-packages.mjs'
import { prepareWebsiteRelease } from './prepare-website-release.mjs'

const root = process.cwd()
const git = args => spawnSync('git', args, { cwd: root, encoding: 'utf8' })

const runGit = args => {
  const result = git(args)

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed`)
  }

  return result.stdout
}

const applyVersions = () => {
  const result = spawnSync('pnpm', ['run', 'version-packages:apply'], {
    cwd: root,
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    throw new Error('package versioning failed')
  }

  if (
    existsSync(resolve(root, '.changeset/generated-website-build-inputs.md'))
  ) {
    throw new Error(
      'versioning did not consume the generated coordination changeset',
    )
  }
}

const main = () => {
  if (runGit(['status', '--porcelain']).trim() !== '') {
    throw new Error(
      'version planning requires a clean working tree; commit or stash changes first',
    )
  }

  const workspacePackages = readWorkspacePackages(root)
  const changesetDirectory = resolve(root, '.changeset')
  const changesetPaths = readdirSync(changesetDirectory, {
    recursive: true,
    withFileTypes: true,
  })
    .filter(entry => entry.isFile())
    .map(entry => resolve(entry.parentPath, entry.name))
  const prereleasePaths = changesetPaths
    .filter(
      path => dirname(path) === changesetDirectory && path.endsWith('.md'),
    )
    .map(path => resolve(changesetDirectory, 'pre', basename(path)))
  const paths = new Set([
    ...SHARED_PACKAGE_INPUTS.map(path => resolve(root, path)),
    ...changesetPaths,
    ...prereleasePaths,
    resolve(root, '.changeset/pre/generated-website-build-inputs.md'),
    resolve(root, '.changeset/generated-website-build-inputs.md'),
    resolve(root, '.changeset/pre.json'),
    ...workspacePackages.flatMap(pkg => [
      pkg.manifestPath,
      resolve(pkg.dir, 'CHANGELOG.md'),
    ]),
  ])
  const originals = [...paths].map(path => ({
    path,
    contents: existsSync(path) ? readFileSync(path) : undefined,
  }))
  const restore = () => {
    for (const original of originals) {
      if (original.contents === undefined) {
        rmSync(original.path, { force: true })
      } else {
        mkdirSync(dirname(original.path), { recursive: true })
        writeFileSync(original.path, original.contents)
      }
    }
  }
  const assertMetadataChanges = () => {
    const changed = runGit(['diff', '--name-only', 'HEAD', '-z'])
    const untracked = runGit([
      'ls-files',
      '--others',
      '--exclude-standard',
      '-z',
    ])

    for (const path of `${changed}${untracked}`.split('\0')) {
      if (path !== '' && !paths.has(resolve(root, path))) {
        throw new Error(
          `versioning changed ${path} outside the saved release metadata; inspect that file before retrying`,
        )
      }
    }
  }
  const apply = () => {
    try {
      applyVersions()
    } finally {
      assertMetadataChanges()
    }
  }
  const preparation = prepareWebsiteRelease()

  try {
    apply()

    if (
      !preparation.isCoordinated &&
      sharedPackageInputsDiffer({
        git,
        publishedTagCommits: preparation.publishedTagCommits,
      })
    ) {
      console.log(
        'Versioning changed shared build inputs. Replanning with coordination patches.',
      )
      restore()
      prepareWebsiteRelease({ isCoordinationRequired: true })
      apply()
    }
  } catch (error) {
    restore()
    throw error
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
