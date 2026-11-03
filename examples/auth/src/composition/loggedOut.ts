import { LoggedOutBlock } from '../blocks'
import { RedirectToDashboard, SaveSession } from '../command'
import { ApplicationDefinition, makeStep } from '../definition'
import { ApplicationRoute } from '../route'
import { BaseLoggedInBinding, BaseLoggedOutBinding } from './bindings'

const foldLoggedOutOutMessage = ApplicationDefinition.makeOutMessageFold(
  LoggedOutBlock,
  {
    SucceededLogin: ({ session }) =>
      makeStep(() =>
        BaseLoggedInBinding.init({
          args: [ApplicationRoute.Dashboard(), session],
          toParentModel: loggedIn => loggedIn,
          commands: [SaveSession({ session }), RedirectToDashboard()],
        }),
      ),
  },
)

export const LoggedOutBinding = BaseLoggedOutBinding.withOutMessagePolicy({
  fold: foldLoggedOutOutMessage,
})
