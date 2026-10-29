import { Schema } from 'effect'

import * as LoggedIn from './page/loggedIn'
import * as LoggedOut from './page/loggedOut'

export const Model = Schema.Union([
  LoggedOut.LoggedOutBlock.Model,
  LoggedIn.LoggedInBlock.Model,
])
export type Model = typeof Model.Type
