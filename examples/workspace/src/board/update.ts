import { issueStatusLabel } from '../domain'
import { IssueBoardComposition } from './composition'
import { OutMessage, makeFieldsStep, makeOutMessageStep } from './definition'

export const update = IssueBoardComposition.makeUpdate({
  InformedOfIssueMove: makeFieldsStep.fromMessage(
    ({ status, insertionIndex }) => ({
      announcement: () =>
        `Moved to ${issueStatusLabel(status)}, position ${insertionIndex + 1}.`,
    }),
  ),
  InformedOfIssueMoveFailure: makeFieldsStep(() => ({
    announcement: () => 'Could not save the move. Issue position restored.',
  })),
  ClickedCreateIssue: makeOutMessageStep.fromMessage(({ status }) =>
    OutMessage.RequestedCreation({ status }),
  ),
})
