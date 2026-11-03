import type { LoggedOutRoute } from '../../route'
import { LoggedOutComposition } from './composition'

export const init = LoggedOutComposition.makeInit((route: LoggedOutRoute) => ({
  model: { _tag: 'LoggedOut', route },
}))
