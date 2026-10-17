export const UPDATE_WORK_MS = 10
export const VIEW_WORK_MS = 24
export const SUBSCRIPTION_DEPENDENCIES_WORK_MS = 8
export const PATCH_ROW_COUNT = 4000

// NOTE: This diagnostic demo deliberately times synchronous update, view,
// and Subscription dependency work.
// oxlint-disable foldkit/no-impure-call-at-decision-time
export const burnCpu = (durationMs: number): number => {
  const stopAt = performance.now() + durationMs
  let checksum = 0

  while (performance.now() < stopAt) {
    checksum = (checksum + Math.sqrt(checksum + 1)) % 100000
  }

  return checksum
}
// oxlint-enable foldkit/no-impure-call-at-decision-time
