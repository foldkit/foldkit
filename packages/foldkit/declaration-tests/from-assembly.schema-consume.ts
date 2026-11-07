import { Schema } from 'effect'
import { Block } from 'foldkit'

import type { Assert, Equal } from './from-assembly.assertions.js'
import { Viewed } from './from-assembly.barrel.js'

export const ParentModel = Schema.Struct({ child: Viewed.Model })
export const OptionalChildren = Schema.Option(Schema.Array(Viewed.Model))
export type ChildType = Assert<
  Equal<typeof Viewed.Model.Type, Readonly<{ count: number }>>
>
export type ChildEncoded = Assert<
  Equal<typeof Viewed.Model.Encoded, Readonly<{ count: number }>>
>
export type DecodingServices = Assert<
  Equal<typeof Viewed.Model.DecodingServices, never>
>
export type EncodingServices = Assert<
  Equal<typeof Viewed.Model.EncodingServices, never>
>
export const ParentDefinition = Block.makeDefinition(
  'BlockOnlyHeaderConsumer',
  { Model: ParentModel, Message: Schema.Never },
)
export const ChildBinding = ParentDefinition.makeRequiredFieldBinding(Viewed, {
  field: 'child',
  init: false,
})
