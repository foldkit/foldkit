import type { Session } from '../../domain/session'
import type { LoggedInRoute } from '../../route'
import { LoggedInComposition } from './composition'
import { Model } from './model'

export const init = LoggedInComposition.makeInit(
  (route: LoggedInRoute, session: Session) => ({
    model: Model({ route, session }),
  }),
)
