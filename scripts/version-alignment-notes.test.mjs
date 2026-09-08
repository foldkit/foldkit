import assert from 'node:assert/strict'
import { test } from 'node:test'

import { extractReleaseNotes } from './lib/github-release.mjs'
import {
  addNotesForVersionedPackages,
  addVersionAlignmentNotes,
  VERSION_ALIGNMENT_NOTES,
} from './version-alignment-notes.mjs'

const ROOT = '/repo'

const workspacePackage = (name, version, directory, extra = {}) => ({
  dir: `${ROOT}/${directory}`,
  manifestPath: `${ROOT}/${directory}/package.json`,
  packageJson: { name, version, ...extra },
})

test('adds truthful alignment notes to an empty generated changelog section', () => {
  const changelog = addVersionAlignmentNotes(
    '# devtools\n\n## 0.158.1\n\n',
    '0.158.1',
  )

  assert.equal(
    changelog,
    `# devtools\n\n## 0.158.1\n\n${VERSION_ALIGNMENT_NOTES}\n`,
  )
  assert.equal(
    extractReleaseNotes(changelog, '0.158.1'),
    VERSION_ALIGNMENT_NOTES,
  )
})

test('preserves package-specific generated notes', () => {
  const changelog = '# foldkit\n\n## 0.158.1\n\n- Added a feature\n'

  assert.equal(addVersionAlignmentNotes(changelog, '0.158.1'), changelog)
})

test('adds alignment notes without changing older release sections', () => {
  const changelog = '# devtools\n\n## 0.158.1\n\n## 0.158.0\n\n- Older notes\n'

  assert.equal(
    addVersionAlignmentNotes(changelog, '0.158.1'),
    `# devtools\n\n## 0.158.1\n\n${VERSION_ALIGNMENT_NOTES}\n\n## 0.158.0\n\n- Older notes\n`,
  )
})

test('only updates public packages versioned by the current release', () => {
  const aligned = workspacePackage(
    '@foldkit/devtools',
    '0.158.1',
    'packages/devtools',
  )
  const unchanged = workspacePackage(
    '@foldkit/markdown',
    '1.0.0',
    'packages/markdown',
  )
  const privatePackage = workspacePackage(
    'website',
    '2.0.0',
    'packages/website',
    {
      private: true,
    },
  )
  const files = new Map([
    [
      aligned.manifestPath,
      JSON.stringify({ name: aligned.packageJson.name, version: '0.158.0' }),
    ],
    [unchanged.manifestPath, JSON.stringify(unchanged.packageJson)],
    [`${aligned.dir}/CHANGELOG.md`, '# devtools\n\n## 0.158.1\n\n'],
    [`${unchanged.dir}/CHANGELOG.md`, '# markdown\n\n## 1.0.0\n\n'],
    [`${privatePackage.dir}/CHANGELOG.md`, '# website\n\n## 2.0.0\n\n'],
  ])

  const writes = new Map()
  const updatedPackages = addNotesForVersionedPackages({
    root: ROOT,
    workspacePackages: [aligned, unchanged, privatePackage],
    readHeadFile: path => files.get(path),
    readFile: path => files.get(path),
    writeFile: (path, contents) => writes.set(path, contents),
  })

  assert.deepEqual(updatedPackages, ['@foldkit/devtools'])
  assert.deepEqual(
    [...writes],
    [
      [
        `${aligned.dir}/CHANGELOG.md`,
        `# devtools\n\n## 0.158.1\n\n${VERSION_ALIGNMENT_NOTES}\n`,
      ],
    ],
  )
})
