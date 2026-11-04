import { ApplicationBlock } from '../definition'
import { LoggedInBinding } from './loggedIn'
import { LoggedOutBinding } from './loggedOut'

export const ApplicationComposition = ApplicationBlock.makeComposition({
  bindings: [LoggedOutBinding, LoggedInBinding],
})
