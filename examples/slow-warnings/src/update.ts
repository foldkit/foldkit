import { Array, Number, pipe } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { ApplicationComposition } from './composition'
import { Message } from './message'
import { type SlowWarning } from './model'
import { PATCH_ROW_COUNT, UPDATE_WORK_MS, burnCpu } from './workload'

const MAX_WARNING_COUNT = 8

const prependWarning =
  (warning: SlowWarning) =>
  (warnings: ReadonlyArray<SlowWarning>): ReadonlyArray<SlowWarning> =>
    pipe(warnings, Array.prepend(warning), Array.take(MAX_WARNING_COUNT))

export const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedRunUpdateWork: () => {
      burnCpu(UPDATE_WORK_MS)
      return {
        model: modifyFields(model, { activeWorkload: () => 'Update' }),
      }
    },
    ClickedRunViewWork: () => ({
      model: modifyFields(model, { activeWorkload: () => 'View' }),
    }),
    ClickedRunPatchWork: () => ({
      model: modifyFields(model, {
        activeWorkload: () => 'Patch',
        patchRows: () => PATCH_ROW_COUNT,
        patchRun: Number.increment,
      }),
    }),
    ClickedRunSubscriptionDependenciesWork: () => ({
      model: modifyFields(model, {
        activeWorkload: () => 'SubscriptionDependencies',
      }),
    }),
    ClickedClearWarnings: () => ({
      model: modifyFields(model, {
        activeWorkload: () => 'Idle',
        warnings: () => [],
      }),
    }),
    RecordedSlowWarning: ({ report }) => {
      const warning: SlowWarning = { id: model.nextWarningId, ...report }
      return {
        model: modifyFields(model, {
          activeWorkload: () => 'Idle',
          nextWarningId: Number.increment,
          warnings: prependWarning(warning),
        }),
      }
    },
  }),
)
