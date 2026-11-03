import { modifyFields } from 'foldkit/struct'

import { ContextDefinition } from '../contract-provisioning-proof/src/context-and-codecs'

const Composition = ContextDefinition.makeComposition()

export const update = Composition.makeUpdate.withContext(context => ({
  Changed: (model, { value }) => {
    // @ts-expect-error The declared Context retains its exact string-valued prefix.
    const invalidPrefix: number = context.prefix
    // @ts-expect-error The declared Context does not acquire arbitrary properties.
    context.missing
    void invalidPrefix

    return {
      model: modifyFields(model, {
        value: () => `${context.prefix}${value}`,
      }),
    }
  },
  Cleared: ContextDefinition.makeFieldsStep(() => ({ value: () => '' })),
}))
