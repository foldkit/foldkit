import { Schema } from 'effect'

import { LoggedIn, LoggedOut } from './page'

export const Model = Schema.Union([LoggedOut.Model, LoggedIn.Model])

export type Model = typeof Model.Type

export { LoggedOut, LoggedIn }
