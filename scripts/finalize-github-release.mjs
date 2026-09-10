import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  GitHubRepository,
  finalizeGitHubReleases,
  releasePackagesForCommit,
} from './lib/github-release.mjs'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const fail = message => {
  throw new Error(message)
}

const requiredEnvironment = name => {
  const value = process.env[name]

  if (value === undefined || value === '') {
    return fail(`${name} is required to finalize a release`)
  }

  return value
}

const main = async () => {
  const publishedCommit = requiredEnvironment('PUBLISHED_COMMIT')
  const repository = requiredEnvironment('GITHUB_REPOSITORY')
  const token = requiredEnvironment('GITHUB_TOKEN')
  const release = releasePackagesForCommit({
    root: REPO_ROOT,
    publishedCommit,
  })
  const github = new GitHubRepository({ repository, token })
  const result = await finalizeGitHubReleases({
    packages: release.packages,
    commit: release.commit,
    github,
  })

  console.log(
    `Created ${String(result.createdTags.length)} Git tags and ${String(result.createdReleases.length)} GitHub Releases for ${release.commit}.`,
  )
  console.log(
    `Kept ${String(result.existingTags.length)} matching Git tags and ${String(result.existingReleases.length)} matching GitHub Releases.`,
  )
}

main().catch(error => {
  const message = error instanceof Error ? error.stack : String(error)

  console.error(`[github-release] FAIL ${message}`)
  process.exitCode = 1
})
