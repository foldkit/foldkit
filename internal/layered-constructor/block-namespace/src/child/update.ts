import { modifyFields } from 'foldkit/struct'

import { ChildComposition } from './composition.js'
import { ChildDefinition, OutMessage } from './definition.js'

export const update = ChildComposition.makeUpdate({
  UpdatedCount: ChildDefinition.makeFieldsStep.fromMessage(({ value }) => ({
    count: () => value,
  })),
  RequestedSetCount: (model, { value }) => ({
    model: modifyFields(model, { count: () => value }),
    outMessage: OutMessage.ChangedCount({ count: value }),
  }),
})
