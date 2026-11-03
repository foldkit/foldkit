import { Array } from 'effect'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import semver from 'semver'

import { assembleReleasePlan } from '@changesets/assemble-release-plan'
import { readConfig } from '@changesets/config'
import { readPreState } from '@changesets/pre'
import { readChangesets } from '@changesets/read'
import { getPackages } from '@manypkg/get-packages'

import { packageJsonsForPacking } from './coherent-release.mjs'

const fail = message => {
  throw new Error(message)
}

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    env: process.env,
    timeout: 120_000,
  })

  if (result.status !== 0) {
    fail(
      `${command} ${args.join(' ')} failed${result.stdout || result.stderr ? `\n${result.stdout}${result.stderr}` : ''}`,
    )
  }

  return result.stdout
}

export const readStagedChangesets = async ({ root, outputDirectory }) => {
  const metadataRoot = join(outputDirectory, 'release-metadata')
  mkdirSync(metadataRoot, { recursive: true })
  cpSync(join(root, '.changeset'), join(metadataRoot, '.changeset'), {
    recursive: true,
    dereference: true,
  })

  const preState = await readPreState(metadataRoot)
  const changesets = await readChangesets(metadataRoot)

  return { changesets, preState }
}

const readReleasePlan = async (root, outputDirectory) => {
  const packages = await getPackages(root)
  const { config, errors } = await readConfig(root, packages)

  if (errors !== undefined) {
    fail(`Cannot stage packed consumer packages: ${errors.join('; ')}`)
  }

  const { changesets, preState } = await readStagedChangesets({
    root,
    outputDirectory,
  })

  return assembleReleasePlan(changesets, packages, config, preState)
}

export const selectPlannedPackageVersions = (packageJsons, releases) => {
  const plannedVersions = new Map(
    releases.map(({ name, newVersion }) => [name, newVersion]),
  )

  return packageJsons.map(packageJson => {
    const version = plannedVersions.get(packageJson.name) ?? packageJson.version

    if (semver.valid(version) === null) {
      fail(
        `Cannot stage ${packageJson.name}: invalid planned version ${version}`,
      )
    }

    return { ...structuredClone(packageJson), version }
  })
}

export const assertPackedPeerCompatibility = packages => {
  const versions = new Map(
    packages.map(({ packageJson }) => [packageJson.name, packageJson.version]),
  )

  for (const { packageJson } of packages) {
    for (const [name, range] of Object.entries(
      packageJson.peerDependencies ?? {},
    )) {
      const version = versions.get(name)

      if (version === undefined) {
        continue
      }

      if (
        semver.validRange(range) === null ||
        !semver.satisfies(version, range)
      ) {
        fail(
          `Pending Changesets plan is incompatible with ${packageJson.name}@${packageJson.version}: peer ${name}@${range} does not accept planned ${name}@${version}`,
        )
      }
    }
  }
}

const packInto = (packageDir, destination) => {
  const raw = run(
    'npm',
    ['pack', '--json', '--pack-destination', destination],
    {
      cwd: packageDir,
    },
  )
  const [packed] = JSON.parse(raw)

  if (typeof packed?.filename !== 'string') {
    fail(`npm pack returned no filename for ${packageDir}`)
  }

  return join(destination, packed.filename)
}

const extractPackage = (tarball, destination) => {
  mkdirSync(destination, { recursive: true })
  run('tar', ['-xf', tarball, '-C', destination])

  const packageDir = join(destination, 'package')
  const packageJson = JSON.parse(
    readFileSync(join(packageDir, 'package.json'), 'utf8'),
  )

  return { packageDir, packageJson }
}

/**
 * Stage exact packed package contents with the versions from the pending
 * Changesets plan. The caller owns and cleans up `outputDirectory`.
 */
export const stagePackedConsumerPackages = async ({
  root,
  outputDirectory,
  packageDirectories,
}) => {
  const repositoryRoot = resolve(root)
  const outputRoot = resolve(outputDirectory)
  const inputDirectory = join(outputRoot, 'input')
  const unpackDirectory = join(outputRoot, 'unpacked')
  const stageDirectory = join(outputRoot, 'packages')
  mkdirSync(inputDirectory, { recursive: true })
  mkdirSync(unpackDirectory, { recursive: true })
  mkdirSync(stageDirectory, { recursive: true })

  const plan = await readReleasePlan(repositoryRoot, outputRoot)
  const extracted = packageDirectories.map((packageDirectory, index) => {
    const sourceDirectory = resolve(repositoryRoot, packageDirectory)
    const tarball = packInto(sourceDirectory, inputDirectory)
    const destination = join(
      unpackDirectory,
      `${index}-${basename(sourceDirectory)}`,
    )
    const { packageDir, packageJson } = extractPackage(tarball, destination)
    const stagedDirectory = join(
      stageDirectory,
      `${index}-${packageJson.name.replaceAll('/', '-')}`,
    )
    cpSync(packageDir, stagedDirectory, { recursive: true })

    return {
      dir: stagedDirectory,
      manifestPath: join(stagedDirectory, 'package.json'),
      packageJson,
      sourceVersion: packageJson.version,
    }
  })

  const plannedJsons = selectPlannedPackageVersions(
    extracted.map(({ packageJson }) => packageJson),
    plan.releases,
  )
  const records = Array.zip(extracted, plannedJsons).map(
    ([record, packageJson]) => ({
      ...record,
      packageJson,
    }),
  )
  const packedRecords = packageJsonsForPacking(records)

  assertPackedPeerCompatibility(packedRecords)

  for (const record of packedRecords) {
    writeFileSync(
      record.manifestPath,
      `${JSON.stringify(record.packageJson, null, 2)}\n`,
    )
  }

  return packedRecords
}
