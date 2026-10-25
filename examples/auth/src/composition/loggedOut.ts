import { makeVariantBinding } from 'foldkit/variantBinding'

import { RedirectToDashboard, SaveSession } from '../command'
import { ApplicationDefinition } from '../definition'
import { LoggedInBlock, LoggedOutBlock } from '../page'
import { ApplicationRoute } from '../route'

const foldLoggedOutOutMessage = ApplicationDefinition.makeOutMessageFold(
  LoggedOutBlock,
  {
    SucceededLogin: ({ session }) =>
      ApplicationDefinition.makeStep(() => ({
        model: LoggedInBlock.init(ApplicationRoute.Dashboard(), session).model,
        commands: [SaveSession({ session }), RedirectToDashboard()],
      })),
  },
)

export const LoggedOutBinding = makeVariantBinding(
  ApplicationDefinition,
  LoggedOutBlock,
).withOutMessagePolicy({ fold: foldLoggedOutOutMessage })
