import type { Schema } from 'effect'

import { makeDefinitionFactory } from '../constructed/runtime.js'
import type { Definition } from './definition.js'

type AnySchema = Schema.Codec<any, any, any, any>
type AnySelfContainedSchema = Schema.Codec<any, any, never, never>

const make = makeDefinitionFactory('Layer')

/** Authors a checked Block whose executable graph is constructed and scoped by a Layer. */
export const makeDefinition = <
  const Id extends string,
  const ModelSchema extends AnySelfContainedSchema,
  const MessageSchema extends AnySelfContainedSchema,
  const OutMessageSchema extends AnySchema | undefined = undefined,
  const ChildInitContextSchema extends AnySchema | undefined = undefined,
>(
  id: Id &
    (Id extends '' | `${string}/${string}` | `${string}::${string}`
      ? never
      : unknown) &
    (string extends Id ? never : unknown),
  contracts: Readonly<{
    Model: ModelSchema
    Message: MessageSchema
    OutMessage?: OutMessageSchema
    ChildInitContext?: ChildInitContextSchema
  }>,
): Definition<
  Id,
  ModelSchema,
  MessageSchema,
  OutMessageSchema,
  ChildInitContextSchema
> =>
  make<
    Id,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContextSchema
  >(id, contracts)

export { fromLayeredBlock as fromBlock } from '../constructed/runtime.js'
