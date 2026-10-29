import { taggedStruct } from 'foldkit/schema'

import { Session } from '../../domain/session'
import { LoggedInRoute } from '../../route'

export const Model = taggedStruct('LoggedIn', {
  route: LoggedInRoute,
  session: Session,
})
export type Model = typeof Model.Type
