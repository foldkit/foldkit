import { Schema } from 'effect'

import * as Settings from './page/settings'

export const Model = Schema.Struct({
  username: Schema.String,
  settings: Settings.Model,
})
export type Model = typeof Model.Type
