import { Option, Schema } from 'effect'
import * as Block from 'foldkit/block'
import type {
  BindingSpecs,
  BindingsFromSpecs,
  DescriptorBindingSpec,
  StaticSource,
} from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import type { UnselectedOutMessagePolicy } from './package/dist/block/bindChild.js'
import type { ParentBindingContract } from './package/dist/block/binding.js'
import type { Composition as NativeComposition } from './package/dist/block/definition.js'
import type { SourceContracts } from './package/dist/experimental/constructed/authoring.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Assert<Value extends true> = Value
type Same<Left, Right> = [Left, Right] extends [Right, Left] ? true : false

const ChildKey = Symbol('SpecChild')
const ChildModel = Schema.Struct({ id: Schema.String, count: Schema.Number })
const ChildMessage = defineMessageUnion({
  ChangedCount: { count: Schema.Number },
})
const ChildDefinition = Block.makeDefinition('SpecChild', {
  key: ChildKey,
  Model: ChildModel,
  Message: ChildMessage,
  Init: Schema.Tuple([Schema.Number]),
  operations: { changeCount: ChildMessage.ChangedCount },
  view: { kind: 'Element' },
})
const Child = ChildDefinition.contract

const EmittingKey = Symbol('SpecEmittingChild')
const OutMessage = defineMessageUnion({ Changed: { count: Schema.Number } })
const EmittingDefinition = Block.makeDefinition('SpecEmittingChild', {
  key: EmittingKey,
  Model: ChildModel,
  Message: ChildMessage,
  OutMessage,
  Init: Schema.Tuple([Schema.Number]),
  operations: {
    changeCount: {
      message: ChildMessage.ChangedCount,
      outMessage: OutMessage.Changed,
    },
  },
  view: { kind: 'Element' },
})
const EmittingChild = EmittingDefinition.contract

const SilentKey = Symbol('SpecSilentChild')
const SilentDefinition = Block.makeDefinition('SpecSilentChild', {
  key: SilentKey,
  Model: ChildModel,
  Message: Schema.Never,
  Init: Schema.Tuple([Schema.Number]),
  isMessageFree: true,
})
const SilentChild = SilentDefinition.contract

const ParentKey = Symbol('SpecParent')
const Model = Schema.Struct({
  first: Child.Model,
  second: Child.Model,
  maybeChild: Schema.Option(Child.Model),
  rows: Schema.Array(Child.Model),
  wrapped: Schema.Array(
    Schema.Struct({
      key: Schema.String,
      child: Child.Model,
      label: Schema.String,
    }),
  ),
  maybeWrapped: Schema.Option(
    Schema.Struct({ key: Schema.String, child: Child.Model }),
  ),
  byId: Schema.Record(Schema.String, Child.Model),
})
const Message = defineMessageUnion({ ClickedReset: {} })
const Definition = Block.makeDefinition('SpecParent', {
  key: ParentKey,
  Model,
  Message,
  Init: Schema.Tuple([]),
})
const Direct = Definition.makeBinding(Child, {
  field: 'first',
  init: { contextToArgs: () => [1] },
})
const Optional = Definition.makeBinding(Child, { field: 'maybeChild' })
const Keyed = Definition.makeBinding(Child, { field: 'rows', key: 'id' })
const Wrapped = Definition.makeBinding(Child, {
  field: 'wrapped',
  key: 'key',
  childField: 'child',
})
const OptionalWrapped = Definition.makeBinding(Child, {
  field: 'maybeWrapped',
  key: 'key',
  childField: 'child',
})
const Map = Definition.makeMapBinding(Child, { field: 'byId' })
const Accessor = Definition.makeBinding(Child, {
  placement: 'accessor',
  read: model => Option.some(model.first),
  write: (model, nextChild) => modifyFields(model, { first: () => nextChild }),
})
const Unselected = Definition.makeBinding(EmittingChild, {
  field: 'first',
  init: { contextToArgs: () => [1] },
})
const Selected = Unselected.withOutMessagePolicy({
  fold: Definition.makeOutMessageFold(EmittingChild, {
    Changed: () => Definition.makeNoopStep(),
  }),
})
const Silent = Definition.makeBinding(SilentChild, {
  field: 'first',
  init: { contextToArgs: () => [1] },
})
type Restored<Value> = BindingsFromSpecs<
  BindingSpecs<readonly [Value]>,
  typeof Model,
  typeof Message,
  undefined
>[0]

export type DirectFields = Assert<Same<typeof Direct, Restored<typeof Direct>>>
export type DirectKeys = Assert<
  Equal<keyof typeof Direct, keyof Restored<typeof Direct>>
>
export type OptionalFields = Assert<
  Same<typeof Optional, Restored<typeof Optional>>
>
export type KeyedFields = Assert<Same<typeof Keyed, Restored<typeof Keyed>>>
export type WrappedFields = Assert<
  Same<typeof Wrapped, Restored<typeof Wrapped>>
>
export type OptionalWrappedFields = Assert<
  Same<typeof OptionalWrapped, Restored<typeof OptionalWrapped>>
>
export type MapFields = Assert<Same<typeof Map, Restored<typeof Map>>>
export type AccessorFields = Assert<
  Same<typeof Accessor, Restored<typeof Accessor>>
>
export type UnselectedFields = Assert<
  Same<typeof Unselected, Restored<typeof Unselected>>
>
export type SelectedFields = Assert<
  Same<typeof Selected, Restored<typeof Selected>>
>
export type SilentFields = Assert<Same<typeof Silent, Restored<typeof Silent>>>
export type SilentKeys = Assert<
  Equal<keyof typeof Silent, keyof Restored<typeof Silent>>
>
type ParentMessageOf<Value> =
  Value extends ParentBindingContract<any, infer ParentMessage, any>
    ? ParentMessage
    : never
export type SilentParentMessageIsNever = Assert<
  Equal<ParentMessageOf<typeof Silent>, never>
>

const Second = Definition.makeBinding(Child, {
  field: 'second',
  init: { contextToArgs: () => [1] },
})
type ConditionalBinding = typeof Direct | typeof Second
declare const conditional: ConditionalBinding
export const conditionalComposition = Definition.makeComposition({
  bindings: [conditional],
})
export type ConditionalFields = Assert<
  Same<ConditionalBinding, Restored<ConditionalBinding>>
>
export type ConditionalKeys = Assert<
  Equal<keyof ConditionalBinding, keyof Restored<ConditionalBinding>>
>

declare const isNotifying: boolean
const MaybeNotifyingChild = isNotifying ? EmittingChild : Child
const MaybeNotifying = Definition.makeBinding(MaybeNotifyingChild, {
  field: 'first',
  init: { contextToArgs: () => [1] },
})
// @ts-expect-error A potentially notifying child retains its required OutMessage policy.
Definition.makeComposition({ bindings: [MaybeNotifying] })
export type MaybeNotifyingFields = Assert<
  Same<typeof MaybeNotifying, Restored<typeof MaybeNotifying>>
>
type NotifyingChild<Value> =
  Value extends DescriptorBindingSpec<infer Descriptor, any, any, any, any, any>
    ? Descriptor extends Readonly<{ OutMessage: Schema.Top }>
      ? Descriptor
      : never
    : never
type SilentChildOf<Value> =
  Value extends DescriptorBindingSpec<infer Descriptor, any, any, any, any, any>
    ? Descriptor extends Readonly<{ OutMessage: Schema.Top }>
      ? never
      : Descriptor
    : never
type NotifyingPolicy<Value> =
  Value extends DescriptorBindingSpec<
    infer Descriptor,
    any,
    any,
    any,
    any,
    infer Policy
  >
    ? Descriptor extends Readonly<{ OutMessage: Schema.Top }>
      ? Policy
      : never
    : never
type SilentPolicy<Value> =
  Value extends DescriptorBindingSpec<
    infer Descriptor,
    any,
    any,
    any,
    any,
    infer Policy
  >
    ? Descriptor extends Readonly<{ OutMessage: Schema.Top }>
      ? never
      : Policy
    : never
export type NotifyingChildPreserved = Assert<
  Equal<NotifyingChild<typeof MaybeNotifying>, typeof EmittingChild>
>
export type SilentChildPreserved = Assert<
  Equal<SilentChildOf<typeof MaybeNotifying>, typeof Child>
>
export type NotifyingPolicyRequired = Assert<
  Equal<NotifyingPolicy<typeof MaybeNotifying>, UnselectedOutMessagePolicy>
>
export type SilentPolicyIsNever = Assert<
  Equal<SilentPolicy<typeof MaybeNotifying>, never>
>

type Mutable = Array<typeof Direct>
declare const mutable: Mutable
export const mutableComposition = Definition.makeComposition({
  bindings: mutable,
})
type MutableRestored = BindingsFromSpecs<
  BindingSpecs<Mutable>,
  typeof Model,
  typeof Message,
  undefined
>
export type MutableInventory = Assert<Same<Mutable, MutableRestored>>

const NeverParentKey = Symbol('SpecNeverParent')
const NeverDefinition = Block.makeDefinition('SpecNeverParent', {
  key: NeverParentKey,
  Model: Schema.Never,
  Message,
  Init: Schema.Tuple([]),
})
const NeverParent = NeverDefinition.makeBinding(Child, {
  placement: 'never',
  read: () => Option.some(ChildModel.make({ id: 'never', count: 1 })),
  write: model => model,
})
type NeverRestored = BindingsFromSpecs<
  BindingSpecs<readonly [typeof NeverParent]>,
  typeof Schema.Never,
  typeof Message,
  undefined
>[0]
export type NeverParentFields = Assert<Same<typeof NeverParent, NeverRestored>>
export type NeverParentKeys = Assert<
  Equal<keyof typeof NeverParent, keyof NeverRestored>
>

const ContextKey = Symbol('SpecContextChild')
const ContextDefinition = Block.makeDefinition('SpecContextChild', {
  key: ContextKey,
  Model: ChildModel,
  Message: ChildMessage,
  Init: Schema.Tuple([Schema.Number]),
  Context:
    Block.makeInputContract<
      readonly [
        prefix: string,
        attempt?: number,
        ...flags: ReadonlyArray<boolean>,
      ]
    >(),
  operations: { changeCount: ChildMessage.ChangedCount },
})
const Contextual = Definition.makeBinding(ContextDefinition.contract, {
  field: 'first',
  init: { contextToArgs: () => [1] },
  delivery: { toUpdateContext: () => ['next'] },
})
export type ContextualFields = Assert<
  Same<typeof Contextual, Restored<typeof Contextual>>
>
export type ContextualKeys = Assert<
  Equal<keyof typeof Contextual, keyof Restored<typeof Contextual>>
>

type Bindings = readonly [typeof Direct, typeof Optional, typeof Selected]
type OriginalSource = NativeComposition<
  typeof Definition.owner,
  typeof Model,
  typeof Message,
  undefined,
  readonly [],
  Bindings
> &
  SourceContracts<typeof Message, undefined>
type RestoredSource = StaticSource<
  typeof Definition.owner,
  typeof Model,
  typeof Message,
  undefined,
  readonly [],
  BindingSpecs<Bindings>
>
export type AllSourceKeys = Assert<
  Equal<keyof OriginalSource, keyof RestoredSource>
>
export type AllSourceMembers = Assert<Same<OriginalSource, RestoredSource>>
export type SourceInit = Assert<
  Same<OriginalSource['makeInit'], RestoredSource['makeInit']>
>
export type SourceUpdate = Assert<
  Same<OriginalSource['makeUpdate'], RestoredSource['makeUpdate']>
>
export type SourceView = Assert<
  Same<OriginalSource['makeView'], RestoredSource['makeView']>
>
export type SourceCompletion = Assert<
  Same<OriginalSource['prepareBlock'], RestoredSource['prepareBlock']>
>
