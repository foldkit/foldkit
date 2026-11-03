import { IssueBoardComposition } from './composition'
import { makeOutMessageStep } from './definition'
import { OutMessage } from './outMessage'

export const update = IssueBoardComposition.makeUpdate({
  ClickedCreateIssue: makeOutMessageStep.fromMessage(({ status }) =>
    OutMessage.RequestedCreation({ status }),
  ),
})
