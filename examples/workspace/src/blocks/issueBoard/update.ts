import { makeOutMessageStep } from './block'
import { IssueBoardComposition } from './composition'
import { OutMessage } from './outMessage'

export const update = IssueBoardComposition.makeUpdate({
  ClickedCreateIssue: makeOutMessageStep.fromMessage(({ status }) =>
    OutMessage.RequestedCreation({ status }),
  ),
})
