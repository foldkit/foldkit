import { Schema } from 'effect'

import { LoggedIn, LoggedOut } from './blocks'

export const Model = Schema.Union([
  LoggedOut.LoggedOutBlock.Model,
  LoggedIn.LoggedInBlock.Model,
])
export type Model = typeof Model.Type
