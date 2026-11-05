import { Array, Option } from 'effect'

import { makeFieldsStep } from './block'
import { AttachmentsComposition } from './composition'

export const update = AttachmentsComposition.makeUpdate({
  RemovedResume: makeFieldsStep(() => ({
    maybeResume: () => Option.none(),
  })),

  RemovedAdditionalFile: makeFieldsStep.fromMessage(({ fileIndex }) => ({
    additionalFiles: Array.remove(fileIndex),
  })),
})
