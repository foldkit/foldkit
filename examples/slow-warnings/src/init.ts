import { ApplicationComposition } from './composition'
import { Model } from './model'

export const init = ApplicationComposition.makeInit(() => ({
  model: Model.make({
    activeWorkload: 'Idle',
    nextWarningId: 1,
    warnings: [],
    patchRows: 0,
    patchRun: 0,
  }),
}))
