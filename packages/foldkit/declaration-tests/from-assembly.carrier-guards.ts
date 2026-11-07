import type { Schema } from 'effect'
import { Block, Program } from 'foldkit'

import { Model } from './from-assembly.accepted.js'
import {
  prepareErased,
  prepareHeadless,
  prepareReportingHeadless,
  prepareReportingViewed,
  prepareViewed,
} from './from-assembly.accepted.js'
import { OriginalViewed, ParentDefinition } from './from-assembly.accepted.js'

declare const anyProducer: any
export const AnyViewed: Block.AssemblyWithView<
  typeof Model,
  typeof anyProducer
> = anyProducer()
export const AnyHeadless: Block.AssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof anyProducer
> = anyProducer()
export const AnyReportingViewed: Block.AssemblyWithViewAndOutMessage<
  typeof Model,
  typeof anyProducer
> = anyProducer()
export const AnyReportingHeadless: Block.AssemblyWithOutMessage<
  typeof Model,
  typeof anyProducer
> = anyProducer()

// @ts-expect-error A declaration carrier with any Producer has poisoned required fields.
AnyViewed satisfies Block.AnyBlock
// @ts-expect-error The headless carrier cannot launder any into AnyBlock.
AnyHeadless satisfies Block.AnyBlock
// @ts-expect-error The reporting viewed carrier cannot launder any into AnyBlock.
AnyReportingViewed satisfies Block.AnyBlock
// @ts-expect-error The reporting headless carrier cannot launder any into AnyBlock.
AnyReportingHeadless satisfies Block.AnyBlock
// @ts-expect-error The carrier cannot register an any Producer as a valid child.
ParentDefinition.makeRequiredFieldBinding(AnyViewed, {
  field: 'child',
  init: false,
})
// @ts-expect-error The carrier cannot complete a Program with an any Producer.
Program.makeElement({ block: AnyViewed, container: null })

export const NeverResult: Block.AssemblyWithView<
  typeof Model,
  typeof prepareErased
> = prepareErased()
declare const neverProducer: never
export declare const NeverProducer: Block.AssemblyWithView<
  typeof Model,
  typeof neverProducer
>
// @ts-expect-error A never result keeps poisoned fields in the public carrier too.
NeverResult satisfies Block.AnyBlock
// @ts-expect-error A whole-never Producer keeps poisoned fields in the public carrier too.
NeverProducer satisfies Block.AnyBlock
// @ts-expect-error A never-result carrier cannot register a child.
ParentDefinition.makeRequiredFieldBinding(NeverResult, {
  field: 'child',
  init: false,
})
// @ts-expect-error A whole-never carrier cannot register a child.
ParentDefinition.makeRequiredFieldBinding(NeverProducer, {
  field: 'child',
  init: false,
})
// @ts-expect-error A never-result carrier cannot complete a Program.
Program.makeElement({ block: NeverResult, container: null })
// @ts-expect-error A whole-never carrier cannot complete a Program.
Program.makeElement({ block: NeverProducer, container: null })

export const BroadModel: Schema.Codec<
  { count: number | string },
  { count: number | string }
> = Model
export const MutableModel: Schema.Codec<{ count: number }, { count: number }> =
  Model
// @ts-expect-error The completed value also retains invariant Model identity.
export const BroadCarrier: Block.AssemblyWithView<
  typeof BroadModel,
  // @ts-expect-error The public carrier preserves exact Model agreement.
  typeof prepareViewed
> = OriginalViewed
// @ts-expect-error The completed value also rejects a structurally different mutable Model Schema.
export const MutableCarrier: Block.AssemblyWithView<
  typeof MutableModel,
  // @ts-expect-error A structurally assignable mutable header still fails exact Schema agreement.
  typeof prepareViewed
> = OriginalViewed
export const AnyModelCarrier: Block.AssemblyWithView<
  any,
  // @ts-expect-error Any Model cannot disable the carrier's header validation.
  typeof prepareViewed
> = OriginalViewed

declare function twoOverloads(): any
declare function twoOverloads(
  ...args: ReadonlyArray<never>
): ReturnType<typeof prepareViewed>
export const TwoOverloads: Block.AssemblyWithView<
  typeof Model,
  // @ts-expect-error The public carrier retains the complete-producer guard.
  typeof twoOverloads
> = twoOverloads()

declare function threeOverloads(): any
declare function threeOverloads(): never
declare function threeOverloads(
  ...args: ReadonlyArray<never>
): ReturnType<typeof prepareViewed>
export const ThreeOverloads: Block.AssemblyWithView<
  typeof Model,
  // @ts-expect-error A never middle signature cannot bypass the public carrier's marker requirement.
  typeof threeOverloads
> = threeOverloads()

export type AnyModelHeadless = Block.AssemblyWithoutViewOrOutMessage<
  any,
  // @ts-expect-error Every carrier retains exact Model validation.
  typeof prepareHeadless
>
export type BroadModelHeadless = Block.AssemblyWithoutViewOrOutMessage<
  typeof BroadModel,
  // @ts-expect-error Every carrier rejects a broader mutable Model header.
  typeof prepareHeadless
>
export type OverloadedHeadless = Block.AssemblyWithoutViewOrOutMessage<
  typeof Model,
  // @ts-expect-error Every carrier rejects the three-signature overload attack.
  typeof threeOverloads
>
export declare const NeverHeadless: Block.AssemblyWithoutViewOrOutMessage<
  typeof Model,
  never
>
// @ts-expect-error Every carrier keeps whole-never producers unusable as a Block.
NeverHeadless satisfies Block.AnyBlock

export type AnyModelReportingViewed = Block.AssemblyWithViewAndOutMessage<
  any,
  // @ts-expect-error Every carrier retains exact Model validation.
  typeof prepareReportingViewed
>
export type BroadModelReportingViewed = Block.AssemblyWithViewAndOutMessage<
  typeof BroadModel,
  // @ts-expect-error Every carrier rejects a broader mutable Model header.
  typeof prepareReportingViewed
>
export type OverloadedReportingViewed = Block.AssemblyWithViewAndOutMessage<
  typeof Model,
  // @ts-expect-error Every carrier rejects the three-signature overload attack.
  typeof threeOverloads
>
export declare const NeverReportingViewed: Block.AssemblyWithViewAndOutMessage<
  typeof Model,
  never
>
// @ts-expect-error Every carrier keeps whole-never producers unusable as a Block.
NeverReportingViewed satisfies Block.AnyBlock

export type AnyModelReportingHeadless = Block.AssemblyWithOutMessage<
  any,
  // @ts-expect-error Every carrier retains exact Model validation.
  typeof prepareReportingHeadless
>
export type BroadModelReportingHeadless = Block.AssemblyWithOutMessage<
  typeof BroadModel,
  // @ts-expect-error Every carrier rejects a broader mutable Model header.
  typeof prepareReportingHeadless
>
export type OverloadedReportingHeadless = Block.AssemblyWithOutMessage<
  typeof Model,
  // @ts-expect-error Every carrier rejects the three-signature overload attack.
  typeof threeOverloads
>
export declare const NeverReportingHeadless: Block.AssemblyWithOutMessage<
  typeof Model,
  never
>
// @ts-expect-error Every carrier keeps whole-never producers unusable as a Block.
NeverReportingHeadless satisfies Block.AnyBlock
