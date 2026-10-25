import { issueStatusLabel } from '../domain'
import { IssueBoardComposition } from './composition'
import { IssueBoardDefinition, OutMessage } from './definition'

export const update = IssueBoardComposition.makeUpdate({
  InformedOfIssueMove: IssueBoardDefinition.makeFieldsStep.fromMessage(
    ({ status, insertionIndex }) => ({
      announcement: () =>
        `Moved to ${issueStatusLabel(status)}, position ${insertionIndex + 1}.`,
    }),
  ),
  InformedOfIssueMoveFailure: IssueBoardDefinition.makeFieldsStep(() => ({
    announcement: () => 'Could not save the move. Issue position restored.',
  })),
  ClickedCreateIssue: IssueBoardDefinition.makeOutMessageStep.fromMessage(
    ({ status }) => OutMessage.RequestedCreation({ status }),
  ),
})
