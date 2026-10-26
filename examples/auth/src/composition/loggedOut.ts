import { RedirectToDashboard, SaveSession } from '../command'
import { ApplicationDefinition, makeStep } from '../definition'
import { LoggedOutBlock } from '../page'
import { ApplicationRoute } from '../route'
import { LoggedInBinding, LoggedOutBinding } from './bindings'

const foldLoggedOutOutMessage = ApplicationDefinition.makeOutMessageFold(
  LoggedOutBlock,
  {
    SucceededLogin: ({ session }) =>
      makeStep(() =>
        LoggedInBinding.init({
          args: [ApplicationRoute.Dashboard(), session],
          toParentModel: loggedIn => loggedIn,
          commands: [SaveSession({ session }), RedirectToDashboard()],
        }),
      ),
  },
)

export const LoggedOutBindingWithOutMessagePolicy =
  LoggedOutBinding.withOutMessagePolicy({ fold: foldLoggedOutOutMessage })
