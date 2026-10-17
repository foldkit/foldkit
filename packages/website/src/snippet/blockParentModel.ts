import { Schema } from 'effect'

import { Settings } from './page'

export const Model = Schema.Struct({
  username: Schema.String,
  settings: Settings.Model,
})
export type Model = typeof Model.Type
