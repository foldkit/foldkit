import { Schema } from 'effect'

export const DARK_COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)'

export const ResolvedTheme = Schema.Literals(['Dark', 'Light'])
export type ResolvedTheme = typeof ResolvedTheme.Type
