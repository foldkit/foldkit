// ❌ Import the selected implementation just to describe parent state.
import { Schema } from 'effect'

import { SettingsBlock } from './settings/block'

export const Model = Schema.Struct({ settings: SettingsBlock.Model })
export type Model = typeof Model.Type
