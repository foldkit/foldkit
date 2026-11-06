import { type Layer, Schema } from 'effect'
import { Update } from 'foldkit'

import { Load, Store, update } from './schema-boundary-block.js'
import type { Assert, Channels, Equal } from './schema-boundary-equality.js'
import { Message } from './schema-boundary-message.js'
import { Count } from './schema-boundary-model.js'
import {
  ChildBinding,
  ParentBlock,
} from './schema-boundary-parent-composition.js'
import { Model } from './schema-boundary-parent-model.js'
import * as Child from './schema-boundary-public.js'
export type ExactSchema = Assert<
  Equal<typeof Child.Model, typeof Child.ChildBlock.Model>
>
export type ExactChannels = Assert<
  Equal<Channels<typeof Child.Model>, Channels<typeof Child.ChildBlock.Model>>
>
export type Encoded = Assert<
  Equal<typeof Child.Model.Encoded, Readonly<{ count: string }>>
>
export type Decoder = Assert<Equal<typeof Child.Model.DecodingServices, never>>
export type Encoder = Assert<Equal<typeof Child.Model.EncodingServices, never>>
export type RefinedCount = Assert<
  Equal<typeof Child.Model.Type.count, typeof Count.Type>
>
export type ParentDecoder = Assert<Equal<typeof Model.DecodingServices, never>>
export type ParentEncoder = Assert<Equal<typeof Model.EncodingServices, never>>
export type ServiceRequirements = Assert<
  Equal<Layer.Services<typeof Child.ChildBlock.EffectsLayer>, Store>
>
export type CommandRequirements = Assert<
  Equal<
    Update.RequirementsOf<typeof update>,
    ReturnType<typeof Load> extends {
      effect: import('effect').Effect.Effect<
        unknown,
        unknown,
        infer Requirements
      >
    }
      ? Requirements
      : never
  >
>
export type ParentSchema = Assert<Equal<typeof ParentBlock.Model, typeof Model>>
export type ExactMessage = Assert<
  Equal<typeof Child.ChildBlock.Message, typeof Message>
>
export type ExactOperationArguments = Assert<
  Equal<Parameters<typeof ChildBinding.load>, [key: 'Primary' | 'Secondary']>
>
export const verifyExact = (
  schema: typeof Child.Model,
): typeof Child.ChildBlock.Model => schema
export const verifyReverse = (
  schema: typeof Child.ChildBlock.Model,
): typeof Child.Model => schema
export const acceptCodec = (
  schema: typeof Child.Model,
): Schema.Codec<
  typeof Child.Model.Type,
  Readonly<{ count: string }>,
  never,
  never
> => schema
export { Model as ModelOnlyParent } from './schema-boundary-model-only.js'
