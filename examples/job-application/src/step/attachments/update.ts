import { Array, Option } from 'effect'

import { AttachmentsComposition } from './composition'
import { AttachmentsDefinition } from './definition'

export const update = AttachmentsComposition.makeUpdate({
  RemovedResume: AttachmentsDefinition.makeFieldsStep(() => ({
    maybeResume: () => Option.none(),
  })),

  RemovedAdditionalFile: AttachmentsDefinition.makeFieldsStep.fromMessage(
    ({ fileIndex }) => ({
      additionalFiles: Array.remove(fileIndex),
    }),
  ),
})
