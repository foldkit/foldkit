import type { Schema } from 'effect'

import type { Definition as NativeDefinition } from '../constructed/authoring.js'

type AnySchema = Schema.Codec<any, any, any, any>

/** The static authoring contract whose completion produces a Layer-owned Block graph. */
export type Definition<
  Id extends string,
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined = undefined,
  ChildInitContextSchema extends AnySchema | undefined = undefined,
> = NativeDefinition<
  Id,
  ModelSchema,
  MessageSchema,
  OutMessageSchema,
  ChildInitContextSchema,
  'Layer'
>
