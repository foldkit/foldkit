import { Array } from 'effect'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { Writable } from 'node:stream'
import semver from 'semver'

import { GitRepository, releasePackagesForCommit } from './github-release.mjs'
import { canaryVersion } from './package-version.mjs'
import {
  assertCompleteReleaseSet,
  publicWorkspacePackages,
  readWorkspacePackages,
} from './workspace-packages.mjs'

export { canaryVersion }

export const REGISTRY = 'https://registry.npmjs.org'

export const uploadTag = (channel, commit) =>
  `foldkit-${channel}-upload-${commit.slice(0, 12)}`

const REGISTRY_ATTEMPTS = 90
const REGISTRY_DELAY_MILLISECONDS = 10_000
const REGISTRY_REQUEST_TIMEOUT_MILLISECONDS = 30_000
const FULL_GIT_COMMIT_PATTERN = /^[0-9a-f]{40}$/

const fail = message => {
  throw new Error(message)
}

const encodedPackageName = name => encodeURIComponent(name)

export class NpmRegistry {
  constructor(
    baseUrl = REGISTRY,
    {
      fetchRegistry = fetch,
      requestTimeoutMilliseconds = REGISTRY_REQUEST_TIMEOUT_MILLISECONDS,
    } = {},
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.fetchRegistry = fetchRegistry
    this.requestTimeoutMilliseconds = requestTimeoutMilliseconds
  }

  async request(path, description) {
    const signal = AbortSignal.timeout(this.requestTimeoutMilliseconds)

    try {
      return await this.fetchRegistry(`${this.baseUrl}/${path}`, {
        headers: {
          accept: 'application/json',
          'cache-control': 'no-cache',
        },
        signal,
      })
    } catch (error) {
      if (signal.aborted) {
        return fail(`registry request timed out for ${description}`)
      }

      const detail = error instanceof Error ? error.message : String(error)

      return fail(`registry request failed for ${description}: ${detail}`)
    }
  }

  async packument(name) {
    const response = await this.request(encodedPackageName(name), name)

    if (response.status === 404) {
      return undefined
    }

    if (!response.ok) {
      return fail(`registry answered ${String(response.status)} for ${name}`)
    }

    return response.json()
  }

  async version(name, version) {
    const response = await this.request(
      `${encodedPackageName(name)}/${version}`,
      `${name}@${version}`,
    )

    if (response.status === 404) {
      return undefined
    }

    if (!response.ok) {
      return fail(
        `registry answered ${String(response.status)} for ${name}@${version}`,
      )
    }

    return response.json()
  }
}

const internalDependencyFields = [
  'dependencies',
  'optionalDependencies',
  'peerDependencies',
]

export const canaryPackageJsons = (packages, commit) => {
  const versions = new Map(
    packages.map(pkg => [
      pkg.packageJson.name,
      canaryVersion(pkg.packageJson.version, commit),
    ]),
  )

  return packages.map(pkg => {
    const packageJson = structuredClone(pkg.packageJson)
    packageJson.version = versions.get(packageJson.name)

    for (const field of internalDependencyFields) {
      const dependencies = packageJson[field]

      if (typeof dependencies !== 'object' || dependencies === null) {
        continue
      }

      for (const name of Object.keys(dependencies)) {
        const version = versions.get(name)

        if (version !== undefined) {
          dependencies[name] = version
        }
      }
    }

    return { ...pkg, packageJson }
  })
}

const sriFor = tarballPath => {
  const bytes = readFileSync(tarballPath)
  return `sha512-${createHash('sha512').update(bytes).digest('base64')}`
}

const runRequired = (command, args, options = {}) => {
  const executable =
    command === 'pnpm'
      ? (process.env['FOLDKIT_PNPM_EXECUTABLE'] ?? command)
      : command

  const result = spawnSync(executable, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    env: options.env,
    stdio: options.inherit ? 'inherit' : 'pipe',
  })

  if (result.status !== 0) {
    const detail = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim()

    return fail(
      `${command} ${args.join(' ')} failed${detail === '' ? '' : `:\n${detail}`}`,
    )
  }

  return result
}

const environmentWithoutNpmOtp = env => {
  const childEnvironment = { ...env }

  delete childEnvironment['NPM_CONFIG_OTP']
  delete childEnvironment['npm_config_otp']

  return childEnvironment
}

export const promptForNpmOtp = async ({
  input = process.stdin,
  output = process.stderr,
} = {}) => {
  if (input.isTTY !== true || typeof input.setRawMode !== 'function') {
    return fail(
      'npm promotion requires an interactive terminal or NPM_CONFIG_OTP',
    )
  }

  const hiddenOutput = new Writable({
    write(_chunk, _encoding, complete) {
      complete()
    },
  })
  const prompt = createInterface({
    input,
    output: hiddenOutput,
    terminal: true,
    historySize: 0,
  })

  output.write('npm OTP: ')

  try {
    const otp = (await prompt.question('')).trim()

    if (otp === '') {
      return fail('npm OTP cannot be empty')
    }

    return otp
  } finally {
    output.write('\n')
    prompt.close()
  }
}

export const createNpmTagger = ({
  env = process.env,
  promptForOtp = promptForNpmOtp,
  run = runRequired,
} = {}) => {
  const childEnvironment = environmentWithoutNpmOtp(env)
  let otp = env['NPM_CONFIG_OTP'] ?? env['npm_config_otp']

  return async (pkg, tag) => {
    if (otp === undefined || otp === '') {
      otp = await promptForOtp()
    }

    run(
      'npm',
      [
        'dist-tag',
        'add',
        `${pkg.packageJson.name}@${pkg.packageJson.version}`,
        tag,
      ],
      {
        inherit: true,
        env: { ...childEnvironment, NPM_CONFIG_OTP: otp },
      },
    )
  }
}

export const resolveReleaseCommit = (
  root,
  run = runRequired,
  env = process.env,
) => {
  const childEnvironment = environmentWithoutNpmOtp(env)
  const status = run('git', ['status', '--short'], {
    cwd: root,
    env: childEnvironment,
  })

  if (status.stdout.trim() !== '') {
    return fail('release promotion requires a clean checkout')
  }

  const result = run('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    env: childEnvironment,
  })
  const commit = result.stdout.trim()

  if (!FULL_GIT_COMMIT_PATTERN.test(commit)) {
    return fail('release promotion could not resolve an exact Git commit')
  }

  return commit
}

export const verifyStableReleaseCommit = ({
  root,
  commit,
  env = process.env,
  run = runRequired,
  workspacePackages,
  git,
  deriveReleasePackages = releasePackagesForCommit,
}) => {
  const childEnvironment = environmentWithoutNpmOtp(env)
  const packages =
    workspacePackages ?? readWorkspacePackages(root, { env: childEnvironment })
  const repository = git ?? new GitRepository(root, childEnvironment)

  run('git', ['fetch', 'origin', '+refs/heads/main:refs/remotes/origin/main'], {
    cwd: root,
    env: childEnvironment,
  })

  const branches = run(
    'git',
    ['branch', '--remotes', '--contains', commit, '--format=%(refname:short)'],
    { cwd: root, env: childEnvironment },
  )
    .stdout.split('\n')
    .map(branch => branch.trim())
    .filter(branch => branch !== '')

  if (!branches.includes('origin/main')) {
    return fail(`${commit} is not an ancestor of origin/main`)
  }

  return deriveReleasePackages({
    root,
    publishedCommit: commit,
    git: repository,
    workspacePackages: packages,
  })
}

export const dispatchReleaseFinalization = (
  root,
  commit,
  run = runRequired,
  env = process.env,
) => {
  if (!FULL_GIT_COMMIT_PATTERN.test(commit)) {
    return fail('release finalization requires a full lowercase Git commit')
  }

  run(
    'gh',
    ['workflow', 'run', 'release.yml', '-f', `published_commit=${commit}`],
    {
      cwd: root,
      inherit: true,
      env: environmentWithoutNpmOtp(env),
    },
  )
}

const parsePackFilename = output => {
  const parsed = JSON.parse(output)
  const entry = Array.isArray(parsed) ? parsed.at(0) : parsed

  if (typeof entry !== 'object' || entry === null) {
    return fail('pnpm pack did not return package metadata')
  }

  const filename = entry.filename ?? entry.path

  if (typeof filename !== 'string') {
    return fail('pnpm pack did not return a tarball filename')
  }

  return filename
}

const readPackedManifest = tarballPath => {
  const result = runRequired('tar', [
    '-xOf',
    tarballPath,
    'package/package.json',
  ])

  return JSON.parse(result.stdout)
}

export const packPackage = (pkg, outputDirectory, env = process.env) => {
  const result = runRequired(
    'pnpm',
    ['pack', '--pack-destination', outputDirectory, '--json'],
    { cwd: pkg.dir, env },
  )

  const filename = parsePackFilename(result.stdout)
  const tarballPath = resolve(pkg.dir, filename)
  const path = tarballPath.startsWith(resolve(outputDirectory))
    ? tarballPath
    : resolve(outputDirectory, basename(filename))

  const packageJson = readPackedManifest(path)

  return {
    name: packageJson.name,
    version: packageJson.version,
    path,
    integrity: sriFor(path),
    packageJson,
  }
}

const expectedVersions = packages =>
  new Map(packages.map(pkg => [pkg.packageJson.name, pkg.packageJson.version]))

const expectedPackedInternalSpec = (plannedSpec, version) => {
  if (
    typeof plannedSpec !== 'string' ||
    !plannedSpec.startsWith('workspace:')
  ) {
    return plannedSpec
  }

  const workspaceRange = plannedSpec.slice('workspace:'.length)

  if (workspaceRange === '*') {
    return version
  }

  if (workspaceRange === '^' || workspaceRange === '~') {
    return `${workspaceRange}${version}`
  }

  if (semver.validRange(workspaceRange) !== null) {
    return workspaceRange
  }

  return fail(`cannot verify unsupported workspace dependency ${plannedSpec}`)
}

const validateInternalDependencies = (
  metadata,
  versions,
  workspacePackageNames,
) => {
  for (const field of internalDependencyFields) {
    const dependencies = metadata[field]

    if (typeof dependencies !== 'object' || dependencies === null) {
      continue
    }

    for (const [name, spec] of Object.entries(dependencies)) {
      const expected = versions.get(name)

      if (expected === undefined) {
        if (workspacePackageNames.has(name)) {
          return fail(
            `${metadata.name}@${metadata.version} references ${name} outside the coherent public package set`,
          )
        }

        continue
      }

      if (expected.includes('-canary.') && spec !== expected) {
        return fail(
          `${metadata.name}@${metadata.version} has ${field}.${name}=${String(spec)}, which is not the exact canary version ${expected}`,
        )
      }

      if (
        typeof spec !== 'string' ||
        !semver.satisfies(expected, spec, { includePrerelease: true })
      ) {
        return fail(
          `${metadata.name}@${metadata.version} has ${field}.${name}=${String(spec)}, which does not accept ${expected}`,
        )
      }
    }
  }
}

export const verifyRegistrySnapshot = async (
  packages,
  registry,
  workspacePackageNames,
) => {
  const versions = expectedVersions(packages)
  const internalPackageNames = workspacePackageNames ?? new Set(versions.keys())
  const metadataByName = new Map()

  for (const pkg of packages) {
    const { name, version } = pkg.packageJson
    const metadata = await registry.version(name, version)

    if (metadata === undefined) {
      return fail(`registry is missing ${name}@${version}`)
    }

    if (metadata.name !== name || metadata.version !== version) {
      return fail(`registry returned the wrong manifest for ${name}@${version}`)
    }

    validateInternalDependencies(metadata, versions, internalPackageNames)

    metadataByName.set(name, metadata)
  }

  return metadataByName
}

const verifyArtifact = (artifact, metadata) => {
  if (metadata === undefined) {
    return fail(`registry is missing ${artifact.name}@${artifact.version}`)
  }

  if (metadata.dist?.integrity !== artifact.integrity) {
    return fail(
      `registry integrity for ${artifact.name}@${artifact.version} does not match the packed artifact`,
    )
  }
}

const wait = milliseconds =>
  new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds))

const waitForArtifact = async (
  artifact,
  registry,
  attempts = REGISTRY_ATTEMPTS,
  delayMilliseconds = REGISTRY_DELAY_MILLISECONDS,
) => {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const metadata = await registry.version(artifact.name, artifact.version)

    if (metadata !== undefined) {
      verifyArtifact(artifact, metadata)
      return metadata
    }

    if (attempt < attempts) {
      await wait(delayMilliseconds)
    }
  }

  return fail(
    `registry did not expose ${artifact.name}@${artifact.version} after publication`,
  )
}

export const uploadArtifacts = async ({
  artifacts,
  registry,
  publish,
  attempts,
  delayMilliseconds,
}) => {
  const published = []
  const skipped = []

  for (const artifact of artifacts) {
    const existing = await registry.version(artifact.name, artifact.version)

    if (existing !== undefined) {
      verifyArtifact(artifact, existing)
      skipped.push(artifact.name)

      continue
    }

    await publish(artifact)
    await waitForArtifact(artifact, registry, attempts, delayMilliseconds)
    published.push(artifact.name)
  }

  return { published, skipped }
}

export const assertArtifactsMatchPackages = ({
  artifacts,
  packages,
  releasePackages,
  workspacePackageNames,
}) => {
  const plannedByName = new Map(
    packages.map(pkg => [pkg.packageJson.name, pkg.packageJson]),
  )
  const releaseVersions = expectedVersions(releasePackages)
  const internalPackageNames =
    workspacePackageNames ?? new Set(releaseVersions.keys())
  const seen = new Set()

  for (const artifact of artifacts) {
    const plannedPackageJson = plannedByName.get(artifact.name)

    if (plannedPackageJson === undefined) {
      return fail(
        `packed an unexpected artifact ${artifact.name}@${artifact.version}`,
      )
    }

    const plannedVersion = plannedPackageJson.version

    if (seen.has(artifact.name)) {
      return fail(`packed duplicate artifacts for ${artifact.name}`)
    }

    if (
      artifact.version !== plannedVersion ||
      artifact.packageJson.name !== artifact.name ||
      artifact.packageJson.version !== artifact.version
    ) {
      return fail(
        `packed ${artifact.name}@${artifact.version}, expected ${artifact.name}@${plannedVersion}`,
      )
    }

    for (const field of internalDependencyFields) {
      const plannedDependencies = plannedPackageJson[field]
      const packedDependencies = artifact.packageJson[field]

      const plannedEntries =
        typeof plannedDependencies === 'object' && plannedDependencies !== null
          ? Object.entries(plannedDependencies)
          : []
      const packedEntries =
        typeof packedDependencies === 'object' && packedDependencies !== null
          ? Object.entries(packedDependencies)
          : []

      const plannedNames = plannedEntries.map(([name]) => name).sort()
      const packedNames = packedEntries.map(([name]) => name).sort()

      if (JSON.stringify(packedNames) !== JSON.stringify(plannedNames)) {
        return fail(
          `${artifact.name}@${artifact.version} packed ${field} keys ${packedNames.join(', ')}, expected ${plannedNames.join(', ')}`,
        )
      }

      for (const [name, plannedSpec] of plannedEntries) {
        const internalVersion = releaseVersions.get(name)
        const expectedSpec =
          internalVersion === undefined
            ? plannedSpec
            : expectedPackedInternalSpec(plannedSpec, internalVersion)

        if (packedDependencies[name] !== expectedSpec) {
          return fail(
            `${artifact.name}@${artifact.version} packed ${field}.${name}=${String(packedDependencies[name])}, expected ${String(expectedSpec)} from ${String(plannedSpec)}`,
          )
        }
      }
    }

    validateInternalDependencies(
      artifact.packageJson,
      releaseVersions,
      internalPackageNames,
    )

    seen.add(artifact.name)
  }

  const missing = [...plannedByName.keys()].filter(name => !seen.has(name))

  if (Array.isArrayNonEmpty(missing)) {
    return fail(
      `did not pack planned artifacts for ${missing.sort().join(', ')}`,
    )
  }
}

export const uploadPlannedArtifacts = async ({
  artifacts,
  packages,
  releasePackages,
  workspacePackageNames,
  registry,
  publish,
  attempts,
  delayMilliseconds,
}) => {
  assertArtifactsMatchPackages({
    artifacts,
    packages,
    releasePackages,
    workspacePackageNames,
  })

  return uploadArtifacts({
    artifacts,
    registry,
    publish,
    attempts,
    delayMilliseconds,
  })
}

export const assertPackagesAlreadyExist = async (packages, registry) => {
  const neverPublished = []

  for (const pkg of packages) {
    const packument = await registry.packument(pkg.packageJson.name)

    if (packument === undefined) {
      neverPublished.push(pkg.packageJson.name)
    }
  }

  if (Array.isArrayNonEmpty(neverPublished)) {
    return fail(
      `refusing first publication for ${neverPublished.sort().join(', ')}. Bootstrap new package names before adding them to the public workspace set so npm cannot assign latest during a coherent or canary upload`,
    )
  }
}

const remoteTags = root => {
  const result = runRequired('git', ['ls-remote', '--tags', 'origin'], {
    cwd: root,
  })

  return new Set(
    result.stdout
      .split('\n')
      .map(line => line.match(/refs\/tags\/(.+?)(?:\^\{\})?$/)?.[1])
      .filter(tag => tag !== undefined),
  )
}

const packageTag = pkg => `${pkg.packageJson.name}@${pkg.packageJson.version}`

export const uploadedPackageMessage = (channel, pkg) =>
  channel === 'stable'
    ? `Uploaded and verified ${packageTag(pkg)}`
    : packageTag(pkg)

export const packagesForChannel = (packages, channel, commit) =>
  channel === 'canary' ? canaryPackageJsons(packages, commit) : packages

export const packagesToUpload = ({
  packages,
  channel,
  knownTags,
  metadataByName,
}) =>
  channel === 'canary'
    ? packages
    : packages.filter(
        pkg =>
          !knownTags.has(packageTag(pkg)) ||
          metadataByName.get(pkg.packageJson.name) === undefined,
      )

const writeReleaseManifest = (path, packages, channel, commit) => {
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        channel,
        sourceCommit: commit,
        packages: Object.fromEntries(
          packages.map(pkg => [pkg.packageJson.name, pkg.packageJson.version]),
        ),
      },
      null,
      2,
    )}\n`,
  )
}

const buildPackages = (packages, env) => {
  if (Array.isArrayEmpty(packages)) {
    return
  }

  const filters = packages.flatMap(pkg => ['--filter', pkg.packageJson.name])

  runRequired('pnpm', [...filters, 'build'], { env, inherit: true })
}

const publishArtifact = (artifact, uploadTag) => {
  runRequired(
    'npm',
    [
      'publish',
      artifact.path,
      '--access',
      'public',
      '--tag',
      uploadTag,
      '--provenance',
    ],
    { inherit: true },
  )
}

const restoreManifests = originals => {
  for (const [path, content] of originals) {
    writeFileSync(path, content)
  }
}

const writePackageJsons = packages => {
  const originals = new Map()

  for (const pkg of packages) {
    originals.set(pkg.manifestPath, readFileSync(pkg.manifestPath, 'utf8'))
    writeFileSync(
      pkg.manifestPath,
      `${JSON.stringify(pkg.packageJson, null, 2)}\n`,
    )
  }

  return originals
}

export const runCoherentUpload = async ({
  root,
  channel,
  commit,
  registry = new NpmRegistry(),
  tags,
  publish,
  log = console.log,
}) => {
  const workspacePackages = readWorkspacePackages(root)
  const workspacePackageNames = new Set(
    workspacePackages.map(pkg => pkg.packageJson.name),
  )
  const discoveredPublicPackages = publicWorkspacePackages(workspacePackages)
  const releasePackages = packagesForChannel(
    discoveredPublicPackages,
    channel,
    commit,
  )

  assertCompleteReleaseSet(discoveredPublicPackages, releasePackages)

  await assertPackagesAlreadyExist(releasePackages, registry)

  const knownTags = tags ?? remoteTags(root)
  const metadataByName = new Map()

  for (const pkg of releasePackages) {
    metadataByName.set(
      pkg.packageJson.name,
      await registry.version(pkg.packageJson.name, pkg.packageJson.version),
    )
  }

  const packagesToPack = packagesToUpload({
    packages: releasePackages,
    channel,
    knownTags,
    metadataByName,
  })

  const stagingDirectory = mkdtempSync(join(tmpdir(), 'foldkit-release-'))
  const originals = new Map()

  try {
    if (channel === 'canary') {
      for (const [path, content] of writePackageJsons(releasePackages)) {
        originals.set(path, content)
      }
    }

    const releaseManifestPath = join(stagingDirectory, 'release.json')
    writeReleaseManifest(releaseManifestPath, releasePackages, channel, commit)

    const env = {
      ...process.env,
      FOLDKIT_RELEASE_MANIFEST: releaseManifestPath,
    }

    buildPackages(
      Array.isArrayEmpty(packagesToPack) ? [] : releasePackages,
      env,
    )

    const artifacts = packagesToPack.map(pkg =>
      packPackage(pkg, stagingDirectory, env),
    )
    const temporaryTag = uploadTag(channel, commit)

    const result = await uploadPlannedArtifacts({
      artifacts,
      packages: packagesToPack,
      releasePackages,
      workspacePackageNames,
      registry,
      publish: publish ?? (artifact => publishArtifact(artifact, temporaryTag)),
    })

    await verifyRegistrySnapshot(
      releasePackages,
      registry,
      workspacePackageNames,
    )

    for (const pkg of packagesToPack) {
      log(uploadedPackageMessage(channel, pkg))
    }

    return { packages: releasePackages, ...result }
  } finally {
    restoreManifests(originals)
    rmSync(stagingDirectory, { recursive: true, force: true })
  }
}

const comparePromotionPackages = (left, right) => {
  if (left.packageJson.name === 'create-foldkit-app') {
    return -1
  }

  if (right.packageJson.name === 'create-foldkit-app') {
    return 1
  }

  return left.packageJson.name.localeCompare(right.packageJson.name)
}

const validateSnapshotMetadata = (
  metadataByName,
  versions,
  workspacePackageNames,
) => {
  for (const [name, metadata] of metadataByName) {
    const version = versions.get(name)

    if (
      version === undefined ||
      metadata.name !== name ||
      metadata.version !== version
    ) {
      return fail(
        `registry metadata does not match the active snapshot for ${name}@${String(version)}`,
      )
    }

    validateInternalDependencies(metadata, versions, workspacePackageNames)
  }
}

const isCompatibleSnapshot = (
  metadataByName,
  versions,
  workspacePackageNames,
) => {
  try {
    validateSnapshotMetadata(metadataByName, versions, workspacePackageNames)
    return true
  } catch {
    return false
  }
}

export const findCompatiblePromotionOrder = ({
  packages,
  currentMetadataByName,
  currentVersions,
  targetMetadataByName,
  workspacePackageNames,
}) => {
  const targetVersions = expectedVersions(packages)
  const remaining = packages
    .filter(
      pkg =>
        currentVersions.get(pkg.packageJson.name) !== pkg.packageJson.version,
    )
    .sort(comparePromotionPackages)

  const failedStates = new Set()

  const search = (candidates, versions, metadataByName) => {
    if (Array.isArrayEmpty(candidates)) {
      return []
    }

    const state = candidates
      .map(pkg => pkg.packageJson.name)
      .sort()
      .join('\n')

    if (failedStates.has(state)) {
      return undefined
    }

    for (const candidate of candidates) {
      const name = candidate.packageJson.name
      const nextVersions = new Map(versions)
      const nextMetadataByName = new Map(metadataByName)

      nextVersions.set(name, targetVersions.get(name))
      nextMetadataByName.set(name, targetMetadataByName.get(name))

      if (
        !isCompatibleSnapshot(
          nextMetadataByName,
          nextVersions,
          workspacePackageNames,
        )
      ) {
        continue
      }

      const tail = search(
        candidates.filter(pkg => pkg.packageJson.name !== name),
        nextVersions,
        nextMetadataByName,
      )

      if (tail !== undefined) {
        return [candidate, ...tail]
      }
    }

    failedStates.add(state)

    return undefined
  }

  const order = search(
    remaining,
    new Map(currentVersions),
    new Map(currentMetadataByName),
  )

  if (order === undefined) {
    return fail(
      'no dependency-compatible dist-tag order exists. No tags were changed. Publish overlapping compatibility ranges first or keep the new release on an exact-version channel until npm supports atomic multi-package promotion',
    )
  }

  return order
}

const readTaggedSnapshot = async ({
  packages,
  tag,
  registry,
  workspacePackageNames,
}) => {
  const versions = new Map()
  const metadataByName = new Map()

  for (const pkg of packages) {
    const name = pkg.packageJson.name
    const packument = await registry.packument(name)
    const version = packument?.['dist-tags']?.[tag]

    if (typeof version !== 'string') {
      return fail(`${name}@${tag} does not name a published version`)
    }

    const metadata = await registry.version(name, version)

    if (metadata === undefined) {
      return fail(`registry is missing ${name}@${version}`)
    }

    versions.set(name, version)
    metadataByName.set(name, metadata)
  }

  validateSnapshotMetadata(metadataByName, versions, workspacePackageNames)

  return { versions, metadataByName }
}

export const waitForTaggedSnapshot = async ({
  packages,
  tag,
  registry,
  attempts = REGISTRY_ATTEMPTS,
  delayMilliseconds = REGISTRY_DELAY_MILLISECONDS,
}) => {
  let mismatches = []

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    mismatches = []

    for (const pkg of packages) {
      const { name, version } = pkg.packageJson

      try {
        const packument = await registry.packument(name)
        const actual = packument?.['dist-tags']?.[tag]

        if (actual !== version) {
          mismatches.push(
            `${name}@${tag} is ${String(actual)}, expected ${version}`,
          )
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error)

        mismatches.push(`${name}@${tag} could not be read: ${detail}`)
      }
    }

    if (Array.isArrayEmpty(mismatches)) {
      return
    }

    if (attempt < attempts) {
      await wait(delayMilliseconds)
    }
  }

  return fail(
    `registry did not expose the complete ${tag} snapshot after promotion: ${mismatches.join('; ')}`,
  )
}

export const promoteSnapshot = async ({
  packages,
  tag,
  registry,
  addTag,
  workspacePackageNames = new Set(packages.map(pkg => pkg.packageJson.name)),
  attempts,
  delayMilliseconds,
}) => {
  const targetMetadataByName = await verifyRegistrySnapshot(
    packages,
    registry,
    workspacePackageNames,
  )
  const currentSnapshot = await readTaggedSnapshot({
    packages,
    tag,
    registry,
    workspacePackageNames,
  })

  for (const pkg of packages) {
    const { name, version } = pkg.packageJson
    const currentVersion = currentSnapshot.versions.get(name)

    if (
      typeof currentVersion === 'string' &&
      semver.valid(currentVersion) !== null &&
      semver.gt(currentVersion, version)
    ) {
      return fail(
        `refusing to move ${name}@${tag} backward from ${currentVersion} to ${version}. No tags were changed`,
      )
    }
  }

  const order = findCompatiblePromotionOrder({
    packages,
    currentMetadataByName: currentSnapshot.metadataByName,
    currentVersions: currentSnapshot.versions,
    targetMetadataByName,
    workspacePackageNames,
  })

  const alreadyPromoted = packages
    .filter(
      pkg =>
        currentSnapshot.versions.get(pkg.packageJson.name) ===
        pkg.packageJson.version,
    )
    .map(pkg => pkg.packageJson.name)

  const promoted = []

  for (const pkg of order) {
    const { name, version } = pkg.packageJson
    const packument = await registry.packument(name)

    if (packument === undefined) {
      return fail(`registry is missing ${name}`)
    }

    const currentTag = packument['dist-tags']?.[tag]

    if (currentTag === version) {
      currentSnapshot.versions.set(name, version)
      currentSnapshot.metadataByName.set(name, targetMetadataByName.get(name))
      alreadyPromoted.push(name)

      continue
    }

    const plannedCurrent = currentSnapshot.versions.get(name)

    if (currentTag !== plannedCurrent) {
      return fail(
        `${name}@${tag} changed from ${String(plannedCurrent)} to ${String(currentTag)} during promotion`,
      )
    }

    if (
      typeof currentTag === 'string' &&
      semver.valid(currentTag) !== null &&
      semver.gt(currentTag, version)
    ) {
      return fail(
        `refusing to move ${name}@${tag} backward from ${currentTag} to ${version}`,
      )
    }

    await addTag(pkg, tag)

    await waitForTaggedSnapshot({
      packages: [pkg],
      tag,
      registry,
      attempts,
      delayMilliseconds,
    })

    currentSnapshot.versions.set(name, version)
    currentSnapshot.metadataByName.set(name, targetMetadataByName.get(name))
    promoted.push(name)
  }

  await waitForTaggedSnapshot({
    packages,
    tag,
    registry,
    attempts,
    delayMilliseconds,
  })

  return { alreadyPromoted, promoted }
}

export const promoteCurrentWorkspace = async ({
  root,
  tag = 'latest',
  registry = new NpmRegistry(),
}) => {
  const workspacePackages = readWorkspacePackages(root)
  const packages = publicWorkspacePackages(workspacePackages)
  const result = await promoteSnapshot({
    packages,
    tag,
    registry,
    workspacePackageNames: new Set(
      workspacePackages.map(pkg => pkg.packageJson.name),
    ),
    addTag: createNpmTagger(),
  })

  return { packages, ...result }
}

export const promoteAndFinalizeCurrentWorkspace = async ({
  root,
  resolveCommit = () => resolveReleaseCommit(root),
  verifyCommit = commit => verifyStableReleaseCommit({ root, commit }),
  promote = () => promoteCurrentWorkspace({ root }),
  dispatch = commit => dispatchReleaseFinalization(root, commit),
}) => {
  const publishedCommit = resolveCommit()

  verifyCommit(publishedCommit)

  const result = await promote()

  await dispatch(publishedCommit)

  return { ...result, publishedCommit }
}
