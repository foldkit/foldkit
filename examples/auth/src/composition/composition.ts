import { makeComposition } from '../block'
import { LoggedInBinding } from './loggedIn'
import { LoggedOutBinding } from './loggedOut'

export const ApplicationComposition = makeComposition({
  bindings: [LoggedOutBinding, LoggedInBinding],
})
