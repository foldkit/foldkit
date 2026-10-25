import { Array, Number, pipe } from 'effect'

import { ApplicationComposition } from './composition'
import { ApplicationDefinition } from './definition'
import { type SlowWarning } from './model'
import { PATCH_ROW_COUNT, UPDATE_WORK_MS, burnCpu } from './workload'

const MAX_WARNING_COUNT = 8

const prependWarning =
  (warning: typeof SlowWarning.Type) =>
  (
    warnings: ReadonlyArray<typeof SlowWarning.Type>,
  ): ReadonlyArray<typeof SlowWarning.Type> =>
    pipe(warnings, Array.prepend(warning), Array.take(MAX_WARNING_COUNT))

export const update = ApplicationComposition.makeUpdate({
  ClickedRunUpdateWork: ApplicationDefinition.makeFieldsStep(() => {
    burnCpu(UPDATE_WORK_MS)
    return { activeWorkload: () => 'Update' }
  }),
  ClickedRunViewWork: ApplicationDefinition.makeFieldsStep(() => ({
    activeWorkload: () => 'View',
  })),
  ClickedRunPatchWork: ApplicationDefinition.makeFieldsStep(() => ({
    activeWorkload: () => 'Patch',
    patchRows: () => PATCH_ROW_COUNT,
    patchRun: Number.increment,
  })),
  ClickedRunSubscriptionDependenciesWork: ApplicationDefinition.makeFieldsStep(
    () => ({
      activeWorkload: () => 'SubscriptionDependencies',
    }),
  ),
  ClickedClearWarnings: ApplicationDefinition.makeFieldsStep(() => ({
    activeWorkload: () => 'Idle',
    warnings: () => [],
  })),
  RecordedSlowWarning: ApplicationDefinition.makeFieldsStep(
    (model, { report }) => {
      const warning: typeof SlowWarning.Type = {
        id: model.nextWarningId,
        ...report,
      }
      return {
        activeWorkload: () => 'Idle',
        nextWarningId: Number.increment,
        warnings: prependWarning(warning),
      }
    },
  ),
})
