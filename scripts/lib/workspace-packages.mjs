import { Array } from 'effect'
import { spawnSync } from 'node:child_process'
import { readFileSync, realpathSync } from 'node:fs'
import { relative, resolve } from 'node:path'

const fail = message => {
  throw new Error(message)
}

const parseWorkspaceList = output => {
  const parsed = JSON.parse(output)

  if (!Array.isArray(parsed)) {
    return fail('pnpm did not return a workspace package array')
  }

  return parsed
}

export const workspacePackagesFromEntries = (root, entries) => {
  const canonicalRoot = realpathSync(root)
  const packages = []

  for (const entry of entries) {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      typeof entry.path !== 'string'
    ) {
      return fail('pnpm returned a workspace entry without a path')
    }

    const dir = realpathSync(resolve(root, entry.path))
    const relativeDir = relative(canonicalRoot, dir)

    if (relativeDir.startsWith('..')) {
      return fail(`workspace package is outside the repository: ${dir}`)
    }

    const manifestPath = resolve(dir, 'package.json')
    const packageJson = JSON.parse(readFileSync(manifestPath, 'utf8'))

    if (typeof packageJson.name !== 'string') {
      return fail(`${manifestPath} has no package name`)
    }

    if (typeof packageJson.version !== 'string') {
      return fail(`${manifestPath} has no package version`)
    }

    packages.push({ dir, manifestPath, packageJson })
  }

  return packages
}

export const readWorkspacePackages = (
  root,
  { env = process.env, run = spawnSync } = {},
) => {
  const childEnvironment = { ...env }

  delete childEnvironment['NPM_CONFIG_OTP']
  delete childEnvironment['npm_config_otp']

  const pnpm = childEnvironment['FOLDKIT_PNPM_EXECUTABLE'] ?? 'pnpm'

  const result = run(pnpm, ['ls', '-r', '--depth', '-1', '--json'], {
    cwd: root,
    encoding: 'utf8',
    env: childEnvironment,
  })

  if (result.status !== 0) {
    const detail = `${result.stdout}\n${result.stderr}`.trim()

    return fail(`could not list pnpm workspace packages:\n${detail}`)
  }

  return workspacePackagesFromEntries(root, parseWorkspaceList(result.stdout))
}

export const publicWorkspacePackages = packages =>
  packages.filter(pkg => pkg.packageJson.private !== true)

export const assertCompleteReleaseSet = (publicPackages, releasePackages) => {
  const publicNames = new Set(publicPackages.map(pkg => pkg.packageJson.name))
  const releaseNames = new Set(releasePackages.map(pkg => pkg.packageJson.name))

  const missing = [...publicNames].filter(name => !releaseNames.has(name))
  const unexpected = [...releaseNames].filter(name => !publicNames.has(name))

  if (Array.isArrayNonEmpty(missing) || Array.isArrayNonEmpty(unexpected)) {
    const details = []

    if (Array.isArrayNonEmpty(missing)) {
      details.push(`missing public packages: ${missing.sort().join(', ')}`)
    }

    if (Array.isArrayNonEmpty(unexpected)) {
      details.push(`unexpected packages: ${unexpected.sort().join(', ')}`)
    }

    return fail(`the coherent release set is incomplete: ${details.join('; ')}`)
  }
}
