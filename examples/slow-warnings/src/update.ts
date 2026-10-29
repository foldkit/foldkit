import { Array, Number, pipe } from 'effect'

import { ApplicationComposition } from './composition'
import { makeFieldsStep } from './definition'
import { type SlowWarning } from './model'
import { PATCH_ROW_COUNT, UPDATE_WORK_MS, burnCpu } from './workload'

const MAX_WARNING_COUNT = 8

const prependWarning =
  (warning: SlowWarning) =>
  (warnings: ReadonlyArray<SlowWarning>): ReadonlyArray<SlowWarning> =>
    pipe(warnings, Array.prepend(warning), Array.take(MAX_WARNING_COUNT))

export const update = ApplicationComposition.makeUpdate({
  ClickedRunUpdateWork: makeFieldsStep(() => {
    burnCpu(UPDATE_WORK_MS)
    return { activeWorkload: () => 'Update' }
  }),
  ClickedRunViewWork: makeFieldsStep(() => ({
    activeWorkload: () => 'View',
  })),
  ClickedRunPatchWork: makeFieldsStep(() => ({
    activeWorkload: () => 'Patch',
    patchRows: () => PATCH_ROW_COUNT,
    patchRun: Number.increment,
  })),
  ClickedRunSubscriptionDependenciesWork: makeFieldsStep(() => ({
    activeWorkload: () => 'SubscriptionDependencies',
  })),
  ClickedClearWarnings: makeFieldsStep(() => ({
    activeWorkload: () => 'Idle',
    warnings: () => [],
  })),
  RecordedSlowWarning: makeFieldsStep((model, { report }) => {
    const warning: SlowWarning = {
      id: model.nextWarningId,
      ...report,
    }
    return {
      activeWorkload: () => 'Idle',
      nextWarningId: Number.increment,
      warnings: prependWarning(warning),
    }
  }),
})
