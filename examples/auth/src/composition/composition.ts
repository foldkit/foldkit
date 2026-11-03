import { ApplicationDefinition } from '../definition'
import { LoggedInBinding } from './loggedIn'
import { LoggedOutBinding } from './loggedOut'

export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [LoggedOutBinding, LoggedInBinding],
})
