import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const verifyPreviewReleaseCommit = ({
  publishedCommit,
  githubSha,
  checkedOutCommit,
}) => {
  if (!/^[0-9a-f]{40}$/.test(publishedCommit)) {
    throw new Error('published_commit must be a full lowercase Git commit SHA')
  }

  if (publishedCommit !== githubSha || publishedCommit !== checkedOutCommit) {
    throw new Error(
      `the requested preview commit ${publishedCommit} does not match the selected ref and checkout`,
    )
  }

  return publishedCommit
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const checkedOutCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim()

  verifyPreviewReleaseCommit({
    publishedCommit: process.env.PUBLISHED_COMMIT ?? '',
    githubSha: process.env.GITHUB_SHA ?? '',
    checkedOutCommit,
  })
}
