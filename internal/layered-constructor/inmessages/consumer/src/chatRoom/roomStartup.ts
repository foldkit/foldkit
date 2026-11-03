import { Schema } from 'effect'

export const RoomStartup = Schema.Struct({
  title: Schema.String,
  inputId: Schema.String,
})
export type RoomStartup = typeof RoomStartup.Type
