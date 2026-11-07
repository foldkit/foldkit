import { makeOutMessageFold, makeStep } from '../block'
import { LoggedOutBlock } from '../blocks'
import { RedirectToDashboard, SaveSession } from '../command'
import { ApplicationRoute } from '../route'
import { BaseLoggedInBinding, BaseLoggedOutBinding } from './bindings'

export const LoggedOutBinding = BaseLoggedOutBinding.withOutMessagePolicy({
  fold: makeOutMessageFold(LoggedOutBlock, {
    SucceededLogin: ({ session }) =>
      makeStep(() =>
        BaseLoggedInBinding.init({
          args: [ApplicationRoute.Dashboard(), session],
          toParentModel: loggedIn => loggedIn,
          commands: [SaveSession({ session }), RedirectToDashboard()],
        }),
      ),
  }),
})
