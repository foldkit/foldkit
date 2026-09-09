import { spawnSync } from 'node:child_process'

import { shouldCheckChangesetStatus } from './lib/changeset-status.mjs'

const context = {
  eventName: process.env.FOLDKIT_CI_EVENT_NAME,
  headRef: process.env.FOLDKIT_CI_HEAD_REF,
  headRepository: process.env.FOLDKIT_CI_HEAD_REPOSITORY,
  repository: process.env.FOLDKIT_CI_REPOSITORY,
}

if (shouldCheckChangesetStatus(context)) {
  const result = spawnSync(
    'pnpm',
    ['changeset', 'status', '--since=origin/main'],
    { stdio: 'inherit' },
  )

  if (result.error !== undefined) {
    throw result.error
  }
  if (result.status === null) {
    throw new Error(`Changeset status terminated with ${result.signal}.`)
  }

  process.exitCode = result.status
} else {
  console.log('Skipping changeset status for this workflow event.')
}
