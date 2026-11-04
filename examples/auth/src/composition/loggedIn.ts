import { LoggedInBlock } from '../blocks'
import { ClearSession, RedirectToHome } from '../command'
import { ApplicationBlock, makeStep } from '../definition'
import { ApplicationRoute } from '../route'
import { BaseLoggedInBinding, BaseLoggedOutBinding } from './bindings'

const foldLoggedInOutMessage = ApplicationBlock.makeOutMessageFold(
  LoggedInBlock,
  {
    RequestedLogout: () =>
      makeStep(() =>
        BaseLoggedOutBinding.init({
          args: [ApplicationRoute.Home()],
          toParentModel: loggedOut => loggedOut,
          commands: [ClearSession(), RedirectToHome()],
        }),
      ),
  },
)

export const LoggedInBinding = BaseLoggedInBinding.withOutMessagePolicy({
  fold: foldLoggedInOutMessage,
})
