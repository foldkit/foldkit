import { Schema } from 'effect'

/** The occurrence selected by the captured Binding key or the newly joined room ID. */
export const Context = Schema.Struct({ roomId: Schema.String })
export type Context = typeof Context.Type
