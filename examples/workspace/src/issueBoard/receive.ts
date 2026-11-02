import { issueStatusLabel } from '../domain'
import { IssueBoardComposition } from './composition'
import { makeFieldsStep } from './definition'

export const receive = IssueBoardComposition.makeReceive({
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
