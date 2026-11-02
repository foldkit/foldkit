import { Schema } from 'effect'

import { Theme } from './blockSettingsContract'

export const Flags = Schema.Struct({ savedTheme: Theme })
export type Flags = typeof Flags.Type
