import { LoggedOutBlock } from '../blocks'
import { RedirectToDashboard, SaveSession } from '../command'
import { ApplicationDefinition, makeStep } from '../definition'
import { ApplicationRoute } from '../route'
import { loggedInBinding, loggedOutBinding } from './bindings'

const foldLoggedOutOutMessage = ApplicationDefinition.makeOutMessageFold(
  LoggedOutBlock,
  {
    SucceededLogin: ({ session }) =>
      makeStep(() =>
        loggedInBinding.init({
          args: [ApplicationRoute.Dashboard(), session],
          toParentModel: loggedIn => loggedIn,
          commands: [SaveSession({ session }), RedirectToDashboard()],
        }),
      ),
  },
)

export const LoggedOutBinding = loggedOutBinding.withOutMessagePolicy({
  fold: foldLoggedOutOutMessage,
})
