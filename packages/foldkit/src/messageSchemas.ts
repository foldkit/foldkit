import type { Schema } from 'effect'

/** @internal Non-empty result Message Schema declarations. */
export type MessageSchemas = readonly [Schema.Top, ...ReadonlyArray<Schema.Top>]

type NeverMessageSchema<MessageSchema extends Schema.Top> =
  MessageSchema extends Schema.Top
    ? [Schema.Schema.Type<MessageSchema>] extends [never]
      ? MessageSchema
      : never
    : never

/** A non-empty tuple of result Message Schemas, each with a decoded type other
 *  than `never`. Use this type for a generic factory's `messages` parameter
 *  when forwarding it to `Command.define`, `Mount.define`, or
 *  `Mount.defineStream`. */
export type ResultMessageSchemas<Messages extends MessageSchemas> = Messages &
  NoInfer<{
    readonly [Index in keyof Messages]: [
      NeverMessageSchema<Messages[Index]>,
    ] extends [never]
      ? Messages[Index]
      : never
  }>
