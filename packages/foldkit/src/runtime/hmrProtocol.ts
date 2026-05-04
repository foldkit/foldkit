import { Schema as S } from 'effect'

/** Browser → plugin: the runtime preserves its current Model under a stable id so it can be restored after a full reload. */
export const PreserveModelMessage = S.Struct({
  id: S.String,
  model: S.Unknown,
})
/** Browser → plugin: the runtime preserves its current Model under a stable id. */
export type PreserveModelMessage = typeof PreserveModelMessage.Type

/** Browser → plugin: the runtime requests its previously-preserved Model on startup, scoped by id. */
export const RequestModelMessage = S.Struct({
  id: S.String,
})
/** Browser → plugin: the runtime requests its previously-preserved Model on startup. */
export type RequestModelMessage = typeof RequestModelMessage.Type

/** Plugin → browser: the plugin returns the preserved Model for a given runtime id. `model` is omitted when nothing is preserved (cold start, manual refresh). */
export const RestoreModelMessage = S.Struct({
  id: S.String,
  model: S.optional(S.Unknown),
})
/** Plugin → browser: the plugin returns the preserved Model for a given runtime id. */
export type RestoreModelMessage = typeof RestoreModelMessage.Type
