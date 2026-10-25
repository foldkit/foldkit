import { makeVariantBinding } from 'foldkit/variantBinding'

import { ClearSession, RedirectToHome } from '../command'
import { ApplicationDefinition } from '../definition'
import { LoggedInBlock, LoggedOutBlock } from '../page'
import { ApplicationRoute } from '../route'

const foldLoggedInOutMessage = ApplicationDefinition.makeOutMessageFold(
  LoggedInBlock,
  {
    RequestedLogout: () =>
      ApplicationDefinition.makeStep(() => ({
        model: LoggedOutBlock.init(ApplicationRoute.Home()).model,
        commands: [ClearSession(), RedirectToHome()],
      })),
  },
)

export const LoggedInBinding = makeVariantBinding(
  ApplicationDefinition,
  LoggedInBlock,
).withOutMessagePolicy({ fold: foldLoggedInOutMessage })
