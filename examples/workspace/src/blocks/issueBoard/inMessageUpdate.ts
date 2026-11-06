import { makeFieldsStep } from './block'
import { IssueBoardComposition } from './composition'

export const inMessageUpdate = IssueBoardComposition.makeInMessageUpdate({
  InformedOfIssueMoveFailure: makeFieldsStep(() => ({
    announcement: () => 'Could not save the move. Issue position restored.',
  })),
})
