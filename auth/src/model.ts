import { Schema as S } from 'effect'

import { LoggedIn, LoggedOut } from './page'

export const Model = S.Union(LoggedOut.Model, LoggedIn.Model)

export type Model = typeof Model.Type

export { LoggedOut, LoggedIn }
