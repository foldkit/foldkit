import { LoggedInComposition, LoggedInDefinition } from './composition'
import { OutMessage } from './message'

export const update = LoggedInComposition.makeUpdate({
  ClickedLogout: LoggedInDefinition.makeOutMessageStep(() =>
    OutMessage.RequestedLogout(),
  ),
})
