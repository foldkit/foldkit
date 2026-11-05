import { issueStatusLabel } from '../../domain'
import { makeFieldsStep } from './block'
import { IssueBoardComposition } from './composition'

export const inMessageUpdate = IssueBoardComposition.makeInMessageUpdate({
  InformedOfIssueMove: makeFieldsStep.fromMessage(
    ({ status, insertionIndex }) => ({
      announcement: () =>
        `Moved to ${issueStatusLabel(status)}, position ${insertionIndex + 1}.`,
    }),
  ),
  InformedOfIssueMoveFailure: makeFieldsStep(() => ({
    announcement: () => 'Could not save the move. Issue position restored.',
  })),
})
