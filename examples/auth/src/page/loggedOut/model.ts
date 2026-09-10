import { taggedStruct } from 'foldkit/schema'

import { LoggedOutRoute } from '../../route'
import * as Login from './page/login'

// MODEL

export const Model = taggedStruct('LoggedOut', {
  route: LoggedOutRoute,
  loginModel: Login.Model,
})

export type Model = typeof Model.Type

// INIT

export const init = (route: LoggedOutRoute): Model =>
  Model({
    route,
    loginModel: Login.initModel(),
  })
