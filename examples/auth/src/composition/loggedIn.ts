import { LoggedInBlock } from '../blocks'
import { ClearSession, RedirectToHome } from '../command'
import { ApplicationDefinition, makeStep } from '../definition'
import { ApplicationRoute } from '../route'
import { loggedInBinding, loggedOutBinding } from './bindings'

const foldLoggedInOutMessage = ApplicationDefinition.makeOutMessageFold(
  LoggedInBlock,
  {
    RequestedLogout: () =>
      makeStep(() =>
        loggedOutBinding.init({
          args: [ApplicationRoute.Home()],
          toParentModel: loggedOut => loggedOut,
          commands: [ClearSession(), RedirectToHome()],
        }),
      ),
  },
)

export const LoggedInBinding = loggedInBinding.withOutMessagePolicy({
  fold: foldLoggedInOutMessage,
})
