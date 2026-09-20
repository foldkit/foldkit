import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  publicWorkspacePackages,
  readWorkspacePackages,
} from './lib/workspace-packages.mjs'

export const VERSION_ALIGNMENT_NOTES = `### Version Alignment

Updated to keep this package aligned with the rest of this release.
There are no package-specific changes in this release.`

const fail = message => {
  throw new Error(message)
}

const releaseSection = (changelog, version) => {
  const lines = changelog.replaceAll('\r\n', '\n').split('\n')
  const heading = `## ${version}`
  const headingIndex = lines.findIndex(line => line === heading)

  if (headingIndex === -1) {
    return fail(`changelog has no ${heading} section`)
  }

  const followingLines = lines.slice(headingIndex + 1)
  const nextHeadingIndex = followingLines.findIndex(line =>
    line.startsWith('## '),
  )

  return {
    lines,
    start: headingIndex + 1,
    end:
      nextHeadingIndex === -1
        ? lines.length
        : headingIndex + 1 + nextHeadingIndex,
  }
}

export const addVersionAlignmentNotes = (changelog, version) => {
  const section = releaseSection(changelog, version)
  const notes = section.lines
    .slice(section.start, section.end)
    .join('\n')
    .trim()

  if (notes !== '') {
    return changelog
  }

  const before = section.lines.slice(0, section.start).join('\n')
  const after = section.lines.slice(section.end).join('\n')

  return after === ''
    ? `${before}\n\n${VERSION_ALIGNMENT_NOTES}\n`
    : `${before}\n\n${VERSION_ALIGNMENT_NOTES}\n\n${after}`
}

const headFile = (root, path, run) => {
  const result = run('git', ['show', `HEAD:${relative(root, path)}`], {
    cwd: root,
    encoding: 'utf8',
  })

  return result.status === 0 ? result.stdout : undefined
}

export const addNotesForVersionedPackages = ({
  root,
  workspacePackages,
  readHeadFile,
  readFile,
  writeFile,
}) => {
  const updatedPackages = []

  for (const workspacePackage of publicWorkspacePackages(workspacePackages)) {
    const previousManifest = readHeadFile(workspacePackage.manifestPath)
    const previousVersion =
      previousManifest === undefined
        ? undefined
        : JSON.parse(previousManifest).version

    if (previousVersion === workspacePackage.packageJson.version) {
      continue
    }

    const changelogPath = resolve(workspacePackage.dir, 'CHANGELOG.md')
    const changelog = readFile(changelogPath)
    const nextChangelog = addVersionAlignmentNotes(
      changelog,
      workspacePackage.packageJson.version,
    )

    if (nextChangelog === changelog) {
      continue
    }

    writeFile(changelogPath, nextChangelog)
    updatedPackages.push(workspacePackage.packageJson.name)
  }

  return updatedPackages
}

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const updatedPackages = addNotesForVersionedPackages({
    root,
    workspacePackages: readWorkspacePackages(root),
    readHeadFile: path => headFile(root, path, spawnSync),
    readFile: path => readFileSync(path, 'utf8'),
    writeFile: (path, contents) => writeFileSync(path, contents),
  })

  for (const packageName of updatedPackages) {
    console.log(`Added Version Alignment notes for ${packageName}`)
  }
}
