import { makeOutMessageFold, makeStep } from '../block'
import { LoggedInBlock } from '../blocks'
import { ClearSession, RedirectToHome } from '../command'
import { ApplicationRoute } from '../route'
import { BaseLoggedInBinding, BaseLoggedOutBinding } from './bindings'

export const LoggedInBinding = BaseLoggedInBinding.withOutMessagePolicy({
  fold: makeOutMessageFold(LoggedInBlock, {
    RequestedLogout: () =>
      makeStep(() =>
        BaseLoggedOutBinding.init({
          args: [ApplicationRoute.Home()],
          toParentModel: loggedOut => loggedOut,
          commands: [ClearSession(), RedirectToHome()],
        }),
      ),
  }),
})
