import { spawnSync } from 'node:child_process'

const isPlaceholderSha = sha => /^0+$/.test(sha)

/**
 * Resolve the files a change touched, from CLI arguments shaped as
 * `<baseSha> <headSha> [...changedFiles]`.
 *
 * Passing an explicit file list bypasses git entirely, which is how the
 * planners are exercised without a repository.
 *
 * `isUnknownDiff` is the fail-safe signal. It is true when the range could not
 * be resolved, and every caller must treat that as "everything changed" so a
 * planning failure over-selects work rather than silently skipping checks.
 */
export const resolveChangedFiles = argv => {
  const [baseSha, headSha, ...providedChangedFiles] = argv
  const isChangedFileListProvided = providedChangedFiles.at(0) !== undefined

  const isUnknownBase =
    !baseSha ||
    !headSha ||
    isPlaceholderSha(baseSha) ||
    isPlaceholderSha(headSha)

  const diffResult =
    isUnknownBase || isChangedFileListProvided
      ? undefined
      : spawnSync(
          'git',
          ['diff', '--name-only', '-z', `${baseSha}...${headSha}`],
          { encoding: 'utf8' },
        )

  const changedFiles = isChangedFileListProvided
    ? providedChangedFiles
    : diffResult?.status === 0
      ? diffResult.stdout.split('\0').filter(fileName => fileName !== '')
      : []

  const isUnknownDiff =
    !isChangedFileListProvided && (isUnknownBase || diffResult?.status !== 0)

  return { changedFiles, isUnknownDiff }
}
