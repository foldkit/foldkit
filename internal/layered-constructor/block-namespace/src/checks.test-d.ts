import { Effect, Schema } from 'effect'
import * as Block from 'foldkit/block'

import { ChildBlock } from './child/block.js'
import { ChildComposition } from './child/composition.js'
import { ChildDefinition, ChildKey } from './child/definition.js'
import {
  NativeDefinition,
  NativeMessage,
  NativeModel,
  PreboundDefinition,
} from './native.js'
import { SharedNamespace } from './sharedNamespace.js'

type Assert<Value extends true> = Value
type Equal<Left, Right> = [Left, Right] extends [Right, Left] ? true : false
export type ExactInit = Assert<
  Equal<
    Parameters<Effect.Success<typeof ChildBlock.get>['init']>,
    [count: number]
  >
>
export type ExactSelectedOperation = Assert<
  Equal<
    Parameters<Effect.Success<typeof ChildBlock.get>['operations']['setCount']>,
    [
      model: typeof ChildBlock.Model.Type,
      payload:
        | { readonly value: number }
        | { readonly value: number; readonly _tag?: 'RequestedSetCount' },
    ]
  >
>
export type LegacyHasNoContract = Assert<
  Equal<Extract<'contract', keyof typeof NativeDefinition>, never>
>
export type PreboundHasCompletion = Assert<
  Equal<Extract<'makeBlock', keyof typeof PreboundDefinition>, 'makeBlock'>
>

export type ExactChildOwner = Assert<
  Equal<
    typeof ChildDefinition.owner,
    Block.Owner<
      Block.NominalId<'CanonicalNamespaceChild', typeof ChildKey>,
      true
    >
  >
>
export type ExactChildModel = Assert<
  Equal<typeof ChildDefinition.Model, typeof ChildBlock.Model>
>
export type ExactChildMessage = Assert<
  Equal<typeof ChildDefinition.Message, typeof ChildBlock.Message>
>
export type ExactChildFieldsHelper = Assert<
  Equal<
    typeof ChildDefinition.makeFieldsStep,
    Block.DefineStepFields<
      typeof ChildDefinition.Model.Type,
      typeof ChildDefinition.Message.Type
    >
  >
>
export type ExactChildBindingHelper = Assert<
  Equal<
    typeof ChildDefinition.makeBinding,
    Block.MakeBinding<
      typeof ChildDefinition.Model,
      typeof ChildDefinition.Message,
      typeof ChildDefinition.OutMessage,
      undefined,
      'Provided',
      typeof ChildDefinition.owner
    >
  >
>
export type ExactChildFoldHelper = Assert<
  Equal<
    typeof ChildDefinition.makeOutMessageFold,
    Block.MakeDescriptorOutMessageFold<
      typeof ChildDefinition.Model.Type,
      typeof ChildDefinition.Message.Type,
      typeof ChildDefinition.OutMessage.Type
    >
  >
>
export type ExactSilentFieldsHelper = Assert<
  Equal<
    typeof PreboundDefinition.makeFieldsStep,
    Block.DefineStepFields<typeof NativeModel.Type, typeof NativeMessage.Type>
  >
>

const makeChildFieldsStep = ChildDefinition.makeFieldsStep
export const incrementCount = makeChildFieldsStep(() => ({
  count: count => count + 1,
}))
const makeSilentFieldsStep = PreboundDefinition.makeFieldsStep
export const resetCount = makeSilentFieldsStep(() => ({ count: () => 0 }))
const invalidFields = { count: () => 'zero' }
// @ts-expect-error Extracted helpers preserve the exact owning Model fields.
makeChildFieldsStep(() => invalidFields)

type ChildDispatch = Parameters<
  Block.ExecutableOf<typeof ChildBlock>['update']
>[1]
export const dispatchTag = (message: ChildDispatch): string => message._tag
export const rejectForgedDispatch = (
  child: Block.ExecutableOf<typeof ChildBlock>,
) => {
  // @ts-expect-error Tag visibility cannot forge private delivery authority.
  return child.update(child.init(0).model, { _tag: 'ForgedPrivateDelivery' })
}

const missingKey = {
  Model: NativeModel,
  Message: NativeMessage,
  Init: Schema.Tuple([]),
}
// @ts-expect-error A prebound Init declaration cannot fall through to native authoring.
Block.makeDefinition('MissingKey', missingKey)
const missingInit = Object.freeze({
  key: ChildKey,
  Model: NativeModel,
  Message: NativeMessage,
})
// @ts-expect-error A prebound key declaration cannot fall through to native authoring.
Block.makeDefinition('MissingInit', missingInit)
const forgedKey = Object.freeze({ ...missingKey, key: 'forged' })
// @ts-expect-error A forged key is not a unique symbol contract identity.
Block.makeDefinition('ForgedKey', forgedKey)
export const rejectBroadKey = (key: symbol) => {
  const config = { ...missingKey, key }
  // @ts-expect-error A broad symbol cannot fall through to a native Definition.
  return Block.makeDefinition('BroadKey', config)
}
const OtherKey = Symbol('OtherCanonicalKey')
export const rejectUnionKey = (key: typeof ChildKey | typeof OtherKey) => {
  const config = { ...missingKey, key }
  // @ts-expect-error A union of declaration identities is not one canonical owner.
  return Block.makeDefinition('UnionKey', config)
}
const mutablePrebound = { ...missingKey, key: OtherKey }
// @ts-expect-error Mutable object inference widens key to symbol; preserve immutable identity.
Block.makeDefinition('MutableKey', mutablePrebound)

// @ts-expect-error Native namespaces do not accept an independent declaration by structural fallback.
Block.makeNamespace('NativeOnly').makeDefinition(missingKey)

const missingNamespaceInit = Object.freeze({
  key: OtherKey,
  Model: NativeModel,
  Message: NativeMessage,
})
// @ts-expect-error Keyed namespace declarations cannot fall through without Init.
SharedNamespace.makeDefinition(missingNamespaceInit)
// @ts-expect-error Namespace declarations retain exact unique keys.
SharedNamespace.makeDefinition(forgedKey)
export const rejectBroadNamespace = (id: string) => {
  const namespace = Block.makeNamespace(id)
  const config = Object.freeze({ ...missingKey, key: OtherKey })
  // @ts-expect-error An independent declaration requires a concrete namespace identity.
  return namespace.makeDefinition(config)
}

ChildComposition.makeUpdate({
  // @ts-expect-error Inline producers retain the exact local Message payload.
  UpdatedCount: (_model, { missing }) => missing,
  RequestedSetCount: ChildDefinition.makeNoopStep(),
})
const wrongInit = (count: string) => ({ model: { count: count.length } })
// @ts-expect-error Init authoring retains the declared startup arguments.
ChildComposition.makeInit(wrongInit)
