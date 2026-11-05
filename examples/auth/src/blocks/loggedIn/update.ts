import { makeOutMessageStep } from './block'
import { LoggedInComposition } from './composition'
import { OutMessage } from './message'

export const update = LoggedInComposition.makeUpdate({
  ClickedLogout: makeOutMessageStep(() => OutMessage.RequestedLogout()),
})
