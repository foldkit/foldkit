import { assembleReleasePlan } from '@changesets/assemble-release-plan'
import { readConfig } from '@changesets/config'
import { readPreState } from '@changesets/pre'
import { readChangesets } from '@changesets/read'
import { getPackages } from '@manypkg/get-packages'

import { assertConsumer } from './packed-consumer.ts'

export type ChangesetsReleasePlan = ReturnType<typeof assembleReleasePlan>

type PendingRelease = Exclude<
  ChangesetsReleasePlan['releases'][number],
  { type: 'none' }
>

export const readChangesetsReleasePlan = async (
  repoRoot: string,
): Promise<ChangesetsReleasePlan> => {
  const packages = await getPackages(repoRoot)
  const configResult = await readConfig(packages.rootDir, packages)
  assertConsumer(
    configResult.config !== undefined,
    `Could not read the Changesets config:\n${configResult.errors?.join('\n') ?? 'Unknown error'}`,
  )
  const changesets = await readChangesets(packages.rootDir)
  const preState = await readPreState(packages.rootDir)
  return assembleReleasePlan(
    changesets,
    packages,
    configResult.config,
    preState,
  )
}

export const pendingReleaseForMinimum = (
  releasePlan: ChangesetsReleasePlan,
  packageName: string,
  minimum: string,
): PendingRelease => {
  const pendingRelease = releasePlan.releases.find(
    release => release.name === packageName,
  )
  assertConsumer(
    pendingRelease !== undefined && pendingRelease.type !== 'none',
    `${packageName}@${minimum} is not published, and the pending Changesets release plan does not include it`,
  )
  assertConsumer(
    pendingRelease.newVersion === minimum,
    `${packageName}@${minimum} is not published, but the pending Changesets release plan advances it to ${pendingRelease.newVersion}`,
  )
  return pendingRelease
}
