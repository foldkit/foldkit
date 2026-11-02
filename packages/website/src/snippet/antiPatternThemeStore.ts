import { Context, Effect, Schema } from 'effect'

export const Theme = Schema.Literals(['Light', 'Dark', 'System'])
export type Theme = typeof Theme.Type

export class ThemeStore extends Context.Service<
  ThemeStore,
  Readonly<{ load: Effect.Effect<Theme, Error> }>
>()('ThemeStore') {}
