import { SearchComposition } from './composition'
import { makeFieldsStep, makeNoopStep } from './definition'

export const update = SearchComposition.makeUpdate({
  UpdatedQuery: makeFieldsStep.fromMessage(({ value }) => ({
    query: () => value,
  })),
  CompletedSave: makeNoopStep(),
})
