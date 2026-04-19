import { ts } from 'foldkit/schema'

import { Session } from '../../domain/session'
import { LoggedInRoute } from '../../route'

// MODEL

export const Model = ts('LoggedIn', {
  route: LoggedInRoute,
  session: Session,
})

export type Model = typeof Model.Type

// INIT

export const init = (route: LoggedInRoute, session: Session): Model =>
  Model({
    route,
    session,
  })
