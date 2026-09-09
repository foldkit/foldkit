import { spawnSync } from 'node:child_process'

import {
  packageBuildInputs,
  SHARED_PACKAGE_INPUTS,
  WEBSITE_PACKAGES,
} from './lib/website-package-inputs.mjs'

const TARGET = process.argv.at(2) ?? 'HEAD'

const git = args =>
  spawnSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
  })

const resolveCommit = revision => {
  const result = git(['rev-parse', '--verify', `${revision}^{commit}`])
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `could not resolve ${revision}`)
  }

  return result.stdout.trim()
}

const readManifest = (revision, packageEntry) => {
  const path = `${packageEntry.directory}/package.json`
  const result = git(['show', `${revision}:${path}`])
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `could not read ${path}`)
  }

  const manifest = JSON.parse(result.stdout)
  if (
    manifest.name !== packageEntry.name ||
    typeof manifest.version !== 'string'
  ) {
    throw new Error(`${path} does not describe ${packageEntry.name}`)
  }

  return manifest
}

const resolveTag = tag => {
  const result = git(['rev-parse', '--verify', `refs/tags/${tag}^{commit}`])
  if (result.status === 0) {
    return result.stdout.trim()
  }

  return undefined
}

const differs = (from, to, paths) => {
  const result = git(['diff', '--quiet', from, to, '--', ...paths])
  if (result.status === 0) {
    return false
  }
  if (result.status === 1) {
    return true
  }

  throw new Error(result.stderr.trim() || `could not compare ${from} to ${to}`)
}

const isPublicPackageVersioned = (parent, target) => {
  const changedManifests = git([
    'diff',
    '--name-only',
    parent,
    target,
    '--',
    ':(glob)packages/*/package.json',
  ])
  if (changedManifests.status !== 0) {
    throw new Error(
      changedManifests.stderr.trim() ||
        'could not identify versioned workspace packages',
    )
  }

  for (const path of changedManifests.stdout.trim().split('\n')) {
    if (path === '') {
      continue
    }

    const current = git(['show', `${target}:${path}`])
    const previous = git(['show', `${parent}:${path}`])
    if (current.status !== 0 || previous.status !== 0) {
      continue
    }

    const currentManifest = JSON.parse(current.stdout)
    const previousManifest = JSON.parse(previous.stdout)
    if (
      currentManifest.private !== true &&
      typeof currentManifest.version === 'string' &&
      currentManifest.version !== previousManifest.version
    ) {
      return true
    }
  }

  return false
}

const target = resolveCommit(TARGET)
const parent = resolveCommit(`${target}^1`)
const isPackageRelease = isPublicPackageVersioned(parent, target)
const blockers = []
const publishedTagCommits = []
const versionedWebsitePackages = new Set()

for (const packageEntry of WEBSITE_PACKAGES) {
  const manifest = readManifest(target, packageEntry)
  const parentManifest = readManifest(parent, packageEntry)
  const isVersioned = manifest.version !== parentManifest.version
  if (isVersioned) {
    versionedWebsitePackages.add(packageEntry.name)
  }

  const tag = `${packageEntry.name}@${manifest.version}`
  const publishedTag = isVersioned
    ? `${packageEntry.name}@${parentManifest.version}`
    : tag
  const publishedTagCommit = resolveTag(publishedTag)
  if (publishedTagCommit === undefined) {
    blockers.push(`${publishedTag} has no release tag`)
  } else {
    publishedTagCommits.push(publishedTagCommit)
  }

  const tagCommit = resolveTag(tag)
  if (tagCommit === undefined) {
    if (!isVersioned) {
      blockers.push(
        `${tag} has no release tag and was not version bumped in ${TARGET}`,
      )
    }
    continue
  }

  if (isVersioned && tagCommit !== target) {
    blockers.push(`${tag} points to ${tagCommit}, expected ${target}`)
  }

  if (
    differs(tagCommit, target, packageBuildInputs(packageEntry.directory)) &&
    !isVersioned
  ) {
    blockers.push(
      `${packageEntry.directory} differs from its published tag ${tag} but was not version bumped in ${TARGET}`,
    )
  }
}

if (publishedTagCommits.length > 0) {
  const unversionedWebsitePackages = WEBSITE_PACKAGES.filter(
    packageEntry => !versionedWebsitePackages.has(packageEntry.name),
  ).map(packageEntry => packageEntry.name)
  const latestPackageRelease = git(['rev-list', '-1', ...publishedTagCommits])
  if (latestPackageRelease.status !== 0) {
    throw new Error(
      latestPackageRelease.stderr.trim() ||
        'could not identify the latest published website package release',
    )
  }

  if (
    differs(
      latestPackageRelease.stdout.trim(),
      target,
      SHARED_PACKAGE_INPUTS,
    ) &&
    isPackageRelease &&
    unversionedWebsitePackages.at(0) !== undefined
  ) {
    blockers.push(
      `shared package build inputs differ from the latest published website package release but ${unversionedWebsitePackages.join(', ')} were not version bumped in ${TARGET}`,
    )
  }
}

for (const blocker of blockers) {
  console.error(`[website-release] ${blocker}`)
}

if (blockers.length > 0) {
  process.exitCode = 1
}
