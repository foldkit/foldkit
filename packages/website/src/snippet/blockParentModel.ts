import { Schema } from 'effect'

import { Settings } from './blocks'

export const Model = Schema.Struct({
  username: Schema.String,
  settings: Settings.SettingsBlock.Model,
})
export type Model = typeof Model.Type
