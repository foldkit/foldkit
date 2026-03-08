import { Schema as S } from 'effect'

import { Settings } from './page'

export const Model = S.Struct({
  username: S.String,
  settings: Settings.Model,
})

export type Model = typeof Model.Type
