import { ApplicationDefinition } from '../definition'
import { LoggedInBindingWithOutMessagePolicy } from './loggedIn'
import { LoggedOutBindingWithOutMessagePolicy } from './loggedOut'

export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [
    LoggedOutBindingWithOutMessagePolicy,
    LoggedInBindingWithOutMessagePolicy,
  ],
})
