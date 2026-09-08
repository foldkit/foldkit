import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  GitHubRepository,
  extractReleaseNotes,
  finalizeGitHubReleases,
  releasePackagesForCommit,
} from './github-release.mjs'

const COMMIT = '0123456789abcdef0123456789abcdef01234567'
const PARENT = 'fedcba9876543210fedcba9876543210fedcba98'
const ROOT = '/repo'

const workspacePackage = (name, version, directory, extra = {}) => ({
  dir: `${ROOT}/${directory}`,
  manifestPath: `${ROOT}/${directory}/package.json`,
  packageJson: { name, version, ...extra },
})

const releasePackage = (name, version, notes = `${name} notes`) => ({
  name,
  version,
  tag: `${name}@${version}`,
  notes,
})

const releaseMetadata = pkg => ({
  tag_name: pkg.tag,
  name: pkg.tag,
  body: pkg.notes,
  draft: false,
  prerelease: false,
})

class FakeGit {
  constructor(files, head = COMMIT) {
    this.files = files
    this.head = head
  }

  resolveCommit(ref) {
    if (ref === 'HEAD') {
      return this.head
    }

    if (ref === 'release-input') {
      return COMMIT
    }

    throw new Error(`unexpected ref ${ref}`)
  }

  parentCommit(commit) {
    assert.equal(commit, COMMIT)

    return PARENT
  }

  readFileAt(commit, path) {
    return this.files.get(`${commit}:${path}`)
  }
}

class FakeGitHub {
  constructor() {
    this.tags = new Map()
    this.releases = new Map()
    this.createdTags = []
    this.createdReleases = []
    this.releaseFailure = undefined
  }

  async tagCommit(tag) {
    return this.tags.get(tag)
  }

  async releaseForTag(tag) {
    return this.releases.get(tag)
  }

  async createTag(tag, commit) {
    this.createdTags.push({ tag, commit })
    this.tags.set(tag, commit)
  }

  async createRelease(pkg, commit) {
    this.createdReleases.push({ tag: pkg.tag, commit })

    if (this.releaseFailure === pkg.tag) {
      throw new Error(`simulated Release failure for ${pkg.tag}`)
    }

    this.releases.set(pkg.tag, releaseMetadata(pkg))
  }
}

test('release notes are the exact matching changelog section', () => {
  const changelog = `# foldkit

## 2.0.0

### Minor Changes

- New release

## 1.0.0

- Old release
`

  assert.equal(
    extractReleaseNotes(changelog, '2.0.0'),
    '### Minor Changes\n\n- New release',
  )
  assert.equal(extractReleaseNotes('# pkg\n\n## 2.0.0\n\n', '2.0.0'), '')
  assert.throws(
    () => extractReleaseNotes(changelog, '3.0.0'),
    /changelog has no ## 3.0.0 section/,
  )
})

test('release packages come only from versions changed by the exact commit', () => {
  const changed = workspacePackage('foldkit', '2.0.0', 'packages/foldkit')
  const unchanged = workspacePackage(
    '@foldkit/markdown',
    '1.0.0',
    'packages/markdown',
  )
  const privatePackage = workspacePackage(
    'website',
    '1.0.0',
    'packages/website',
    { private: true },
  )
  const files = new Map([
    [
      `${COMMIT}:packages/foldkit/package.json`,
      JSON.stringify(changed.packageJson),
    ],
    [
      `${PARENT}:packages/foldkit/package.json`,
      JSON.stringify({ name: 'foldkit', version: '1.0.0' }),
    ],
    [
      `${COMMIT}:packages/foldkit/CHANGELOG.md`,
      '# foldkit\n\n## 2.0.0\n\n- Exact notes\n\n## 1.0.0\n',
    ],
    [
      `${COMMIT}:packages/markdown/package.json`,
      JSON.stringify(unchanged.packageJson),
    ],
    [
      `${PARENT}:packages/markdown/package.json`,
      JSON.stringify(unchanged.packageJson),
    ],
  ])

  const result = releasePackagesForCommit({
    root: ROOT,
    publishedCommit: 'release-input',
    git: new FakeGit(files),
    workspacePackages: [changed, unchanged, privatePackage],
  })

  assert.equal(result.commit, COMMIT)
  assert.deepEqual(result.packages, [
    {
      name: 'foldkit',
      version: '2.0.0',
      tag: 'foldkit@2.0.0',
      notes: '- Exact notes',
    },
  ])
})

test('release package discovery rejects a different checked-out commit', () => {
  assert.throws(
    () =>
      releasePackagesForCommit({
        root: ROOT,
        publishedCommit: 'release-input',
        git: new FakeGit(new Map(), PARENT),
        workspacePackages: [],
      }),
    new RegExp(
      `published commit ${COMMIT} is not the checked-out commit ${PARENT}`,
    ),
  )
})

test('partial tag and Release creation resumes without recreating completed work', async () => {
  const packages = [
    releasePackage('foldkit', '2.0.0'),
    releasePackage('@foldkit/ui', '2.0.0'),
  ]
  const github = new FakeGitHub()
  github.releaseFailure = '@foldkit/ui@2.0.0'

  await assert.rejects(
    finalizeGitHubReleases({ packages, commit: COMMIT, github }),
    /simulated Release failure/,
  )

  assert.deepEqual(
    github.createdTags.map(entry => entry.tag),
    ['foldkit@2.0.0', '@foldkit/ui@2.0.0'],
  )
  assert.deepEqual(
    github.createdReleases.map(entry => entry.tag),
    ['foldkit@2.0.0', '@foldkit/ui@2.0.0'],
  )

  github.releaseFailure = undefined
  github.createdTags = []
  github.createdReleases = []

  const retry = await finalizeGitHubReleases({
    packages,
    commit: COMMIT,
    github,
  })

  assert.deepEqual(github.createdTags, [])
  assert.deepEqual(github.createdReleases, [
    { tag: '@foldkit/ui@2.0.0', commit: COMMIT },
  ])
  assert.deepEqual(retry.existingTags, ['foldkit@2.0.0', '@foldkit/ui@2.0.0'])
  assert.deepEqual(retry.existingReleases, ['foldkit@2.0.0'])
})

test('a conflicting tag stops the complete plan before any mutation', async () => {
  const packages = [
    releasePackage('foldkit', '2.0.0'),
    releasePackage('@foldkit/ui', '2.0.0'),
  ]
  const github = new FakeGitHub()
  github.tags.set('@foldkit/ui@2.0.0', PARENT)

  await assert.rejects(
    finalizeGitHubReleases({ packages, commit: COMMIT, github }),
    new RegExp(`points to ${PARENT}, expected ${COMMIT}`),
  )

  assert.deepEqual(github.createdTags, [])
  assert.deepEqual(github.createdReleases, [])
})

test('conflicting Release metadata stops before any mutation', async () => {
  const packages = [
    releasePackage('foldkit', '2.0.0'),
    releasePackage('@foldkit/ui', '2.0.0'),
  ]
  const github = new FakeGitHub()
  github.tags.set('@foldkit/ui@2.0.0', COMMIT)
  github.releases.set('@foldkit/ui@2.0.0', {
    ...releaseMetadata(packages.at(1)),
    body: 'wrong notes',
  })

  await assert.rejects(
    finalizeGitHubReleases({ packages, commit: COMMIT, github }),
    /conflicting GitHub Release metadata.*body differs/,
  )

  assert.deepEqual(github.createdTags, [])
  assert.deepEqual(github.createdReleases, [])
})

test('empty release notes stop the complete plan before any mutation', async () => {
  const pkg = releasePackage('foldkit', '2.0.0', '')
  const github = new FakeGitHub()

  await assert.rejects(
    finalizeGitHubReleases({ packages: [pkg], commit: COMMIT, github }),
    /foldkit@2.0.0 has empty release notes/,
  )

  assert.deepEqual(github.createdTags, [])
  assert.deepEqual(github.createdReleases, [])
})

test('new tags and Releases target the exact published commit', async () => {
  const pkg = releasePackage('foldkit', '2.0.0')
  const github = new FakeGitHub()

  await finalizeGitHubReleases({ packages: [pkg], commit: COMMIT, github })

  assert.deepEqual(github.createdTags, [
    { tag: 'foldkit@2.0.0', commit: COMMIT },
  ])
  assert.deepEqual(github.createdReleases, [
    { tag: 'foldkit@2.0.0', commit: COMMIT },
  ])
})

test('GitHub requests create lightweight tags and Releases at the exact commit', async () => {
  const pkg = releasePackage('@foldkit/ui', '2.0.0')
  const github = new GitHubRepository({
    repository: 'foldkit/foldkit',
    token: 'test-token',
  })
  const requests = []
  github.request = async (method, path, body) => {
    requests.push({ method, path, body })
  }

  await github.createTag(pkg.tag, COMMIT)
  await github.createRelease(pkg, COMMIT)

  assert.deepEqual(requests, [
    {
      method: 'POST',
      path: '/git/refs',
      body: { ref: 'refs/tags/@foldkit/ui@2.0.0', sha: COMMIT },
    },
    {
      method: 'POST',
      path: '/releases',
      body: {
        tag_name: '@foldkit/ui@2.0.0',
        target_commitish: COMMIT,
        name: '@foldkit/ui@2.0.0',
        body: '@foldkit/ui notes',
        draft: false,
        prerelease: false,
      },
    },
  ])
})

test('matching tags and Releases are idempotent no-ops', async () => {
  const pkg = releasePackage('foldkit', '2.0.0')
  const github = new FakeGitHub()
  github.tags.set(pkg.tag, COMMIT)
  github.releases.set(pkg.tag, releaseMetadata(pkg))

  const result = await finalizeGitHubReleases({
    packages: [pkg],
    commit: COMMIT,
    github,
  })

  assert.deepEqual(github.createdTags, [])
  assert.deepEqual(github.createdReleases, [])
  assert.deepEqual(result.existingTags, [pkg.tag])
  assert.deepEqual(result.existingReleases, [pkg.tag])
})
