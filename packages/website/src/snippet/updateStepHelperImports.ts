import { makeFieldsStep, makeNoopStep } from './block'
import { SearchComposition } from './composition'

export const update = SearchComposition.makeUpdate({
  UpdatedQuery: makeFieldsStep.fromMessage(({ value }) => ({
    query: () => value,
  })),
  CompletedSave: makeNoopStep(),
})
