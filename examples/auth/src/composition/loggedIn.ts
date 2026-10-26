import { ClearSession, RedirectToHome } from '../command'
import { ApplicationDefinition, makeStep } from '../definition'
import { LoggedInBlock } from '../page'
import { ApplicationRoute } from '../route'
import { LoggedInBinding, LoggedOutBinding } from './bindings'

const foldLoggedInOutMessage = ApplicationDefinition.makeOutMessageFold(
  LoggedInBlock,
  {
    RequestedLogout: () =>
      makeStep(() =>
        LoggedOutBinding.init({
          args: [ApplicationRoute.Home()],
          toParentModel: loggedOut => loggedOut,
          commands: [ClearSession(), RedirectToHome()],
        }),
      ),
  },
)

export const LoggedInBindingWithOutMessagePolicy =
  LoggedInBinding.withOutMessagePolicy({ fold: foldLoggedInOutMessage })
