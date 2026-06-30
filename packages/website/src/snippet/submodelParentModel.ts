import { Schema as S } from 'effect'

import * as Settings from './page/settings'

export const Model = S.Struct({
  username: S.String,
  settings: Settings.Model,
})

export type Model = typeof Model.Type
