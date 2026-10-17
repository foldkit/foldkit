import { ApplicationComposition } from './composition'
import type { Flags } from './flags'
import { Submission } from './model'

export const init = ApplicationComposition.makeInit((flags: Flags) => ({
  startup: flags,
  model: {
    currentStep: 'PersonalInfo',
    isPreviewVisible: false,
    submission: Submission.NotSubmitted(),
    isSubmitAttempted: false,
  },
}))
