import { assertConsumer } from './packed-consumer.ts'

type PendingRelease = Readonly<{
  name: string
  type: 'patch' | 'minor' | 'major'
  newVersion: string
}>

export type ChangesetsReleasePlan = Readonly<{
  releases: ReadonlyArray<PendingRelease>
}>

export const pendingReleaseForMinimum = (
  releasePlan: ChangesetsReleasePlan,
  packageName: string,
  minimum: string,
): PendingRelease => {
  const pendingRelease = releasePlan.releases.find(
    release => release.name === packageName,
  )
  assertConsumer(
    pendingRelease !== undefined,
    `${packageName}@${minimum} is not published, and the pending Changesets release plan does not include it`,
  )
  assertConsumer(
    pendingRelease.newVersion === minimum,
    `${packageName}@${minimum} is not published, but the pending Changesets release plan advances it to ${pendingRelease.newVersion}`,
  )
  return pendingRelease
}
