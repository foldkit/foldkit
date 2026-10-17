import type { LoggedOutRoute } from '../../route'
import { LoggedOutComposition } from './composition'
import { update } from './update'
import { view } from './view'

export const block = LoggedOutComposition.makeBlock({
  init: LoggedOutComposition.makeInit((route: LoggedOutRoute) => ({
    model: { _tag: 'LoggedOut', route },
  })),
  update,
  view,
})
