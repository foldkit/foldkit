import { spawnSync } from 'node:child_process'
import { relative, resolve } from 'node:path'

import {
  publicWorkspacePackages,
  readWorkspacePackages,
} from './workspace-packages.mjs'

const fail = message => {
  throw new Error(message)
}

const packageTag = ({ name, version }) => `${name}@${version}`

const parsePackageManifest = (contents, path) => {
  const packageJson = JSON.parse(contents)

  if (
    typeof packageJson !== 'object' ||
    packageJson === null ||
    typeof packageJson.name !== 'string' ||
    typeof packageJson.version !== 'string'
  ) {
    return fail(`${path} does not contain a package name and version`)
  }

  return packageJson
}

const repositoryPath = (root, path) => {
  const result = relative(resolve(root), resolve(path))

  if (result.startsWith('..')) {
    return fail(`${path} is outside ${root}`)
  }

  return result
}

export const extractReleaseNotes = (changelog, version) => {
  const lines = changelog.replaceAll('\r\n', '\n').split('\n')
  const heading = `## ${version}`
  const headingIndex = lines.findIndex(line => line === heading)

  if (headingIndex === -1) {
    return fail(`changelog has no ${heading} section`)
  }

  const remainingLines = lines.slice(headingIndex + 1)
  const nextHeadingIndex = remainingLines.findIndex(line =>
    line.startsWith('## '),
  )
  const sectionLines =
    nextHeadingIndex === -1
      ? remainingLines
      : remainingLines.slice(0, nextHeadingIndex)

  return sectionLines.join('\n').trim()
}

export class GitRepository {
  constructor(root, env = process.env) {
    this.root = root
    this.env = env
  }

  run(args) {
    return spawnSync('git', args, {
      cwd: this.root,
      encoding: 'utf8',
      env: this.env,
    })
  }

  resolveCommit(ref) {
    const result = this.run(['rev-parse', '--verify', `${ref}^{commit}`])

    if (result.status !== 0) {
      return fail(result.stderr.trim() || `could not resolve ${ref}`)
    }

    return result.stdout.trim()
  }

  parentCommit(commit) {
    return this.resolveCommit(`${commit}^`)
  }

  readFileAt(commit, path) {
    const result = this.run(['show', `${commit}:${path}`])

    if (result.status !== 0) {
      return undefined
    }

    return result.stdout
  }
}

export const releasePackagesForCommit = ({
  root,
  publishedCommit,
  git = new GitRepository(root),
  workspacePackages = readWorkspacePackages(root),
}) => {
  const commit = git.resolveCommit(publishedCommit)
  const head = git.resolveCommit('HEAD')

  if (head !== commit) {
    return fail(
      `published commit ${commit} is not the checked-out commit ${head}`,
    )
  }

  const parent = git.parentCommit(commit)
  const packages = []

  for (const workspacePackage of publicWorkspacePackages(workspacePackages)) {
    const manifestPath = repositoryPath(root, workspacePackage.manifestPath)
    const currentContents = git.readFileAt(commit, manifestPath)

    if (currentContents === undefined) {
      return fail(`${manifestPath} is missing from published commit ${commit}`)
    }

    const currentPackageJson = parsePackageManifest(
      currentContents,
      manifestPath,
    )
    const previousContents = git.readFileAt(parent, manifestPath)

    if (previousContents !== undefined) {
      const previousPackageJson = parsePackageManifest(
        previousContents,
        `${manifestPath} at ${parent}`,
      )

      if (
        previousPackageJson.name === currentPackageJson.name &&
        previousPackageJson.version === currentPackageJson.version
      ) {
        continue
      }
    }

    const changelogPath = repositoryPath(
      root,
      resolve(workspacePackage.dir, 'CHANGELOG.md'),
    )
    const changelog = git.readFileAt(commit, changelogPath)

    if (changelog === undefined) {
      return fail(`${changelogPath} is missing from published commit ${commit}`)
    }

    const releasePackage = {
      name: currentPackageJson.name,
      version: currentPackageJson.version,
      notes: extractReleaseNotes(changelog, currentPackageJson.version),
    }

    packages.push({
      ...releasePackage,
      tag: packageTag(releasePackage),
    })
  }

  if (packages.at(0) === undefined) {
    return fail(`${commit} did not version any public packages`)
  }

  return { commit, packages }
}

export class GitHubRepository {
  constructor({ repository, token }) {
    const match = repository.match(/^([^/]+)\/([^/]+)$/)

    if (match === null) {
      return fail(`invalid GitHub repository ${repository}`)
    }

    if (token === '') {
      return fail('GITHUB_TOKEN is required to finalize a release')
    }

    const [, owner, name] = match

    this.baseUrl = `https://api.github.com/repos/${owner}/${name}`
    this.token = token
  }

  async request(method, path, body) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${this.token}`,
        'content-type': 'application/json',
        'user-agent': 'foldkit-release-finalizer',
        'x-github-api-version': '2022-11-28',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })

    if (method === 'GET' && response.status === 404) {
      return undefined
    }

    const text = await response.text()
    const responseBody = text === '' ? undefined : JSON.parse(text)

    if (!response.ok) {
      const detail = responseBody?.message ?? text

      return fail(
        `GitHub answered ${String(response.status)} for ${method} ${path}${detail === '' ? '' : `: ${String(detail)}`}`,
      )
    }

    return responseBody
  }

  async tagCommit(tag) {
    const ref = await this.request(
      'GET',
      `/git/ref/tags/${encodeURIComponent(tag)}`,
    )

    if (ref === undefined) {
      return undefined
    }

    let object = ref.object
    const seen = new Set()

    while (object?.type === 'tag') {
      if (seen.has(object.sha)) {
        return fail(`GitHub tag ${tag} contains a tag object cycle`)
      }

      seen.add(object.sha)

      const tagObject = await this.request('GET', `/git/tags/${object.sha}`)

      if (tagObject === undefined) {
        return fail(`GitHub tag ${tag} points to missing object ${object.sha}`)
      }

      object = tagObject.object
    }

    if (object?.type !== 'commit' || typeof object.sha !== 'string') {
      return fail(`GitHub tag ${tag} does not resolve to a commit`)
    }

    return object.sha
  }

  createTag(tag, commit) {
    return this.request('POST', '/git/refs', {
      ref: `refs/tags/${tag}`,
      sha: commit,
    })
  }

  releaseForTag(tag) {
    return this.request('GET', `/releases/tags/${encodeURIComponent(tag)}`)
  }

  createRelease(releasePackage, commit) {
    return this.request('POST', '/releases', {
      tag_name: releasePackage.tag,
      target_commitish: commit,
      name: releasePackage.tag,
      body: releasePackage.notes,
      draft: false,
      prerelease: false,
    })
  }
}

const validateExistingRelease = (releasePackage, release) => {
  const conflicts = []
  const body = release.body ?? ''

  if (release.tag_name !== releasePackage.tag) {
    conflicts.push(`tag_name=${String(release.tag_name)}`)
  }

  if (release.name !== releasePackage.tag) {
    conflicts.push(`name=${String(release.name)}`)
  }

  if (body !== releasePackage.notes) {
    conflicts.push('body differs from the matching changelog section')
  }

  if (release.draft !== false) {
    conflicts.push(`draft=${String(release.draft)}`)
  }

  if (release.prerelease !== false) {
    conflicts.push(`prerelease=${String(release.prerelease)}`)
  }

  if (conflicts.at(0) !== undefined) {
    return fail(
      `${releasePackage.tag} has conflicting GitHub Release metadata: ${conflicts.join(', ')}`,
    )
  }
}

export const finalizeGitHubReleases = async ({ packages, commit, github }) => {
  for (const releasePackage of packages) {
    if (releasePackage.notes.trim() === '') {
      return fail(
        `${releasePackage.tag} has empty release notes; add a changelog entry before finalizing`,
      )
    }
  }

  const plan = []

  for (const releasePackage of packages) {
    const tagCommit = await github.tagCommit(releasePackage.tag)

    if (tagCommit !== undefined && tagCommit !== commit) {
      return fail(
        `${releasePackage.tag} points to ${tagCommit}, expected ${commit}`,
      )
    }

    const release = await github.releaseForTag(releasePackage.tag)

    if (release !== undefined) {
      validateExistingRelease(releasePackage, release)
    }

    plan.push({
      releasePackage,
      isTagMissing: tagCommit === undefined,
      isReleaseMissing: release === undefined,
    })
  }

  const createdTags = []
  const existingTags = []
  const createdReleases = []
  const existingReleases = []

  for (const entry of plan) {
    const { releasePackage } = entry

    if (entry.isTagMissing) {
      await github.createTag(releasePackage.tag, commit)
      createdTags.push(releasePackage.tag)
    } else {
      existingTags.push(releasePackage.tag)
    }

    if (entry.isReleaseMissing) {
      await github.createRelease(releasePackage, commit)
      createdReleases.push(releasePackage.tag)
    } else {
      existingReleases.push(releasePackage.tag)
    }
  }

  return {
    createdTags,
    existingTags,
    createdReleases,
    existingReleases,
  }
}
