import { Array, Option } from 'effect'

import { AttachmentsComposition } from './composition'
import { makeFieldsStep } from './definition'

export const update = AttachmentsComposition.makeUpdate({
  RemovedResume: makeFieldsStep(() => ({
    maybeResume: () => Option.none(),
  })),

  RemovedAdditionalFile: makeFieldsStep.fromMessage(({ fileIndex }) => ({
    additionalFiles: Array.remove(fileIndex),
  })),
})
