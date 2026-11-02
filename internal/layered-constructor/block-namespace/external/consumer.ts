import { Effect } from 'effect'
import * as Block from 'foldkit/block'

import { ChildBlock } from '../declarations/child/block.js'
import {
  NativeBlock,
  NativeComposition,
  NativeMessage,
} from '../declarations/native.js'
import {
  Message,
  ParentBlock,
  ParentComposition,
} from '../declarations/parent.js'

export type NativeViewBuilder = Block.ViewBuilderFor<typeof NativeComposition>
export type ParentViewBuilder = Block.ViewBuilderFor<typeof ParentComposition>

export const nativeChanged = NativeBlock.update(
  NativeBlock.init().model,
  NativeMessage.UpdatedCount({ value: 2 }),
)
export const parentChanged = Effect.scoped(
  Effect.gen(function* () {
    const parent = yield* ParentBlock.get
    return parent.update(parent.init().model, Message.ClickedResetCount())
  }).pipe(Effect.provide(ParentBlock.layer)),
)
export const childChanged = Effect.scoped(
  Effect.gen(function* () {
    const child = yield* ChildBlock.get
    const childInit = child.init(2)
    return child.operations.setCount(childInit.model, { value: 3 })
  }).pipe(Effect.provide(ChildBlock.layer)),
)

export const invalidInit = Effect.gen(function* () {
  const child = yield* ChildBlock.get
  // @ts-expect-error The emitted declaration retains the numeric startup input.
  return child.init('invalid')
})
export const invalidPayload = Effect.gen(function* () {
  const child = yield* ChildBlock.get
  // @ts-expect-error The emitted declaration retains the exact operation payload.
  return child.operations.setCount(child.init(0).model, { value: 'invalid' })
})

type ChildDispatch = Parameters<
  Block.ExecutableOf<typeof ChildBlock>['update']
>[1]
export const dispatchTag = (message: ChildDispatch): string => message._tag
export const forgedDispatch = Effect.gen(function* () {
  const child = yield* ChildBlock.get
  // @ts-expect-error A visible tag cannot forge the opaque private delivery brand.
  return child.update(child.init(0).model, { _tag: 'ForgedPrivateDelivery' })
})

import {
  SharedFamilyDefinition,
  FamilyBlock,
  FamilyLayer,
} from '../declarations/sharedFamily.js'
import { SharedNamespace } from '../declarations/sharedNamespace.js'

export const familyAcquired = Effect.scoped(
  FamilyBlock.get.pipe(Effect.provide(FamilyLayer)),
)
export type SharedFamilyOwner = typeof SharedFamilyDefinition.owner
const ForgedEmittedKey = Symbol('ForgedEmittedFamily')
const forgedFamilyNamespace = { makeDefinition: SharedNamespace.makeDefinition }
const rejectForgedFamilyNamespace = () => {
  // @ts-expect-error The emitted namespace identity is required, not its readable id alone.
  Block.makeFamilyDefinition(forgedFamilyNamespace, {
    key: ForgedEmittedKey,
    Model: FamilyBlock.Model,
    Message: FamilyBlock.Message,
    Init: Block.makeInputContract<readonly []>(),
  })
}
void rejectForgedFamilyNamespace
