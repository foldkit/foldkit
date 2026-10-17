import { Application } from '../definition'
import { LoggedInBinding } from './loggedIn'
import { LoggedOutBinding } from './loggedOut'

export const ApplicationComposition = Application.makeComposition({
  childBindings: [LoggedOutBinding, LoggedInBinding],
})
