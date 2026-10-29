import { taggedStruct } from 'foldkit/schema'

import { LoggedOutRoute } from '../../route'
import * as Login from './page/login'

export const Model = taggedStruct('LoggedOut', {
  route: LoggedOutRoute,
  loginModel: Login.LoginBlock.Model,
})
export type Model = typeof Model.Type
