import { Schema } from 'effect'

export const ThemePreference = Schema.Literals(['Dark', 'Light', 'System'])
export type ThemePreference = typeof ThemePreference.Type
