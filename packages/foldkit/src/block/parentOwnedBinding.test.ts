import { Array, Layer, Option, Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { define as defineApplication } from '../runtime/applicationPublic.js'
import { modifyFields } from '../struct/index.js'
import type * as Update from '../update/index.js'
import type { BindingRequirement } from './binding.js'
import { define } from './define.js'

const ChildModel = Schema.Struct({ value: Schema.String })
type ChildModel = typeof ChildModel.Type
const ChildMessage = defineMessageUnion({
  UpdatedValue: { value: Schema.String },
})
type ChildMessage = typeof ChildMessage.Type
const ChildOutMessage = defineMessageUnion({
  SelectedValue: { value: Schema.String },
})
type ChildOutMessage = typeof ChildOutMessage.Type

type CommandMessageOfReturn<Value> =
  Value extends Update.ResultRecipe<any, infer Message, any, any, any>
    ? Message
    : Value extends Readonly<{
          commands?: Update.Commands<infer Message, any> | undefined
        }>
      ? Message
      : never

const Child = define('ParentOwnedBindingChild', {
  Model: ChildModel,
  Message: ChildMessage,
  OutMessage: ChildOutMessage,
})
const selectValue = Child.step(model => ({
  model,
  outMessage: ChildOutMessage.SelectedValue({ value: model.value }),
}))
const ChildComposition = Child.makeComposition()
const ChildBlock = ChildComposition.makeBlock({
  init: () => ({ model: ChildModel.make({ value: 'initial' }) }),
  update: ChildComposition.makeUpdate((model, { value }) => ({
    model: modifyFields(model, { value: () => value }),
  })),
  expose: { selectValue },
})

const PlainChild = define('ParentOwnedBindingPlainChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
const PlainChildComposition = PlainChild.makeComposition()
const PlainChildBlock = PlainChildComposition.makeBlock({
  init: () => ({ model: ChildModel.make({ value: 'initial' }) }),
  update: PlainChildComposition.makeUpdate((model, { value }) => ({
    model: modifyFields(model, { value: () => value }),
  })),
})

const setPrototypeValue = PlainChild.step((model, value: string) => ({
  model: modifyFields(model, { value: () => value }),
}))

const PrototypeOperationChildBlock = PlainChildComposition.makeBlock({
  init: PlainChildBlock.init,
  update: PlainChildBlock.update,
  expose: { ['__proto__']: setPrototypeValue },
})

const Entry = Schema.Struct({ id: Schema.Number, child: ChildModel })
type Entry = typeof Entry.Type
const ChildSlot = Schema.TaggedStruct('Child', { child: ChildModel })
const EmptySlot = Schema.TaggedStruct('Empty', {})
const Slot = Schema.Union([ChildSlot, EmptySlot])
const ParentModel = Schema.Struct({
  child: ChildModel,
  maybeChild: Schema.Option(ChildModel),
  slot: Slot,
  entries: Schema.Array(Entry),
  selected: Schema.Option(Schema.String),
})
type ParentModel = typeof ParentModel.Type
const ParentMessage = defineMessageUnion({
  GotChildMessage: { message: ChildMessage },
  GotKeyedChildMessage: { id: Schema.Number, message: ChildMessage },
})
type ParentMessage = typeof ParentMessage.Type
const ParentOutMessage = defineMessageUnion({
  ForwardedSelectedValue: { value: Schema.String },
})
type ParentOutMessage = typeof ParentOutMessage.Type

const Parent = define('ParentOwnedBindingParent', {
  Model: ParentModel,
  Message: ParentMessage,
  OutMessage: ParentOutMessage,
})

const ExactMessageChildBinding = Parent.bindChild(PlainChildBlock, {
  field: 'child',
  placement: 'exactMessageChild',
  parentMessage: ParentMessage.GotChildMessage,
})

const ExactCustomMessageChildBinding = Parent.bindChild(PlainChildBlock, {
  fromParentMessage: false,
  placement: 'exactCustomMessageChild',
  field: 'maybeChild',
  toParentMessage: message => ParentMessage.GotChildMessage({ message }),
})

const foldChildOutMessage = ChildOutMessage.match<
  Update.Step<ParentModel, ParentMessage>,
  ChildOutMessage
>({
  SelectedValue:
    ({ value }) =>
    model => ({
      model: modifyFields(model, { selected: () => Option.some(value) }),
    }),
})

const DirectChildBinding = Parent.bindChild(ChildBlock, {
  fromParentMessage: false,
  field: 'child',
  parentMessage: ParentMessage.GotChildMessage,
  init: false,
  outMessage: { fold: foldChildOutMessage },
})

const ForwardingChildBinding = Parent.bindChild(ChildBlock, {
  field: 'child',
  placement: 'forwardingChild',
  parentMessage: ParentMessage.GotChildMessage,
  outMessage: {
    forward: outMessage => {
      expectTypeOf(outMessage).toEqualTypeOf<ChildOutMessage>()

      return ChildOutMessage.match<ParentOutMessage>(outMessage, {
        SelectedValue: ({ value }) =>
          ParentOutMessage.ForwardedSelectedValue({ value }),
      })
    },
  },
})

const OptionalChildBinding = Parent.bindChild(ChildBlock, {
  fromParentMessage: false,
  placement: 'optionalChild',
  read: model => model.maybeChild,
  write: (model, nextChild) =>
    modifyFields(model, { maybeChild: () => Option.some(nextChild) }),
  toParentMessage: message => ParentMessage.GotChildMessage({ message }),
  outMessage: {
    fold: (outMessage, context) => {
      expectTypeOf(outMessage).toEqualTypeOf<ChildOutMessage>()
      expectTypeOf(context).toEqualTypeOf<
        Update.FoldContext<ChildMessage, ParentMessage, ParentModel>
      >()

      return foldChildOutMessage(outMessage)
    },
  },
})

const TaggedChildBinding = Parent.bindChild(ChildBlock, {
  fromParentMessage: false,
  placement: 'taggedChild',
  read: model =>
    model.slot._tag === 'Child' ? Option.some(model.slot.child) : Option.none(),
  write: (model, nextChild) =>
    modifyFields(model, {
      slot: () => ChildSlot.make({ child: nextChild }),
    }),
  parentMessage: ParentMessage.GotChildMessage,
  outMessage: { fold: foldChildOutMessage },
})

const KeyedChildBinding = Parent.bindChild(ChildBlock, {
  fromParentMessage: false,
  placement: 'entries',
  readAll: model => model.entries,
  key: entry => entry.id,
  read: entry => entry.child,
  writeAt: (model, id, nextChild) =>
    modifyFields(model, {
      entries: Array.map(entry =>
        entry.id === id
          ? Entry.make({ id: entry.id, child: nextChild })
          : entry,
      ),
    }),
  toParentMessage: (id, message) =>
    ParentMessage.GotKeyedChildMessage({ id, message }),
  outMessage: {
    fold: (id, outMessage, context) => {
      expectTypeOf(id).toEqualTypeOf<number>()
      expectTypeOf(outMessage).toEqualTypeOf<ChildOutMessage>()
      expectTypeOf(context).toEqualTypeOf<
        Update.FoldContext<ChildMessage, ParentMessage, ParentModel>
      >()

      return foldChildOutMessage(outMessage)
    },
  },
})

const ParentComposition = Parent.makeComposition({
  childBindings: [
    DirectChildBinding,
    OptionalChildBinding,
    TaggedChildBinding,
    KeyedChildBinding,
  ],
})

const update = ParentComposition.makeUpdate((model, message) =>
  ParentMessage.match(message, {
    GotChildMessage: ({ message }) => DirectChildBinding.fold(model, message),
    GotKeyedChildMessage: ({ id, message }) =>
      KeyedChildBinding.fold(model, id, message),
  }),
)

const ParentBlock = ParentComposition.makeBlock({
  init: ParentComposition.makeInit(() =>
    DirectChildBinding.init({
      args: [],
      toParentModel: child =>
        ParentModel.make({
          child,
          maybeChild: Option.none(),
          slot: EmptySlot.make({}),
          entries: [],
          selected: Option.none(),
        }),
    }),
  ),
  update,
})

const makeGenericChoice = <const Value extends string>(
  Value: Schema.Schema<Value>,
) => {
  const Model = Schema.Struct({ value: Value })
  const Message = defineMessageUnion({ UpdatedChoice: { value: Value } })
  const OutMessage = defineMessageUnion({ SelectedChoice: { value: Value } })
  const GenericChoice = define('ParentOwnedGenericChoice').define({
    Model,
    Message,
    OutMessage,
  })
  const GenericChoiceComposition = GenericChoice.makeComposition()
  const block = GenericChoiceComposition.makeBlock({
    init: (value: Value) => ({ model: Model.make({ value }) }),
    update: GenericChoiceComposition.makeUpdate((model, { value }) => ({
      model: modifyFields(model, { value: () => value }),
    })),
  })

  return { block, Message, OutMessage }
}

const GenericChoice = makeGenericChoice(Schema.Literals(['One', 'Two']))
const GenericParentModel = Schema.Struct({ choice: GenericChoice.block.Model })
type GenericParentModel = typeof GenericParentModel.Type
const GenericParentMessage = defineMessageUnion({
  GotChoiceMessage: { message: GenericChoice.Message },
})
const GenericParent = define('ParentOwnedGenericParent', {
  Model: GenericParentModel,
  Message: GenericParentMessage,
})
const GenericChoiceBinding = GenericParent.bindChild(GenericChoice.block, {
  field: 'choice',
  parentMessage: GenericParentMessage.GotChoiceMessage,
  init: false,
  outMessage: {
    fold: outMessage =>
      GenericChoice.OutMessage.match<
        Update.Step<GenericParentModel, typeof GenericParentMessage.Type>
      >(outMessage, {
        SelectedChoice:
          ({ value }) =>
          model => {
            expectTypeOf(value).toEqualTypeOf<'One' | 'Two'>()
            return { model }
          },
      }),
  },
})

const makeKeyedGenericParent = <const Value extends string>(
  Value: Schema.Schema<Value>,
) => {
  const Entry = Schema.Struct({
    id: Schema.Literals(['first', 'second']),
    child: ChildModel,
    payload: Value,
  })
  const Model = Schema.Struct({ entries: Schema.Array(Entry) })
  const Message = defineMessageUnion({
    GotChildMessage: {
      id: Schema.Literals(['first', 'second']),
      message: ChildMessage,
    },
  })
  const Parent = define('ParentOwnedKeyedGenericParent', { Model, Message })
  const foldOutMessage = (id: string, outMessage: ChildOutMessage) =>
    ChildOutMessage.match<Update.Step<typeof Model.Type, typeof Message.Type>>(
      outMessage,
      {
        SelectedValue: () => model => {
          expectTypeOf(id).toEqualTypeOf<string>()
          return { model }
        },
      },
    )
  const ChildBinding = Parent.bindChild(ChildBlock, {
    fromParentMessage: false,
    readAll: model => model.entries,
    key: entry => {
      const payload: Value = entry.payload
      void payload
      return entry.id
    },
    read: entry => entry.child,
    writeAt: (model, id, nextChild) =>
      modifyFields(model, {
        entries: Array.map(entry =>
          entry.id === id
            ? modifyFields(entry, { child: () => nextChild })
            : entry,
        ),
      }),
    toParentMessage: (id, message) => Message.GotChildMessage({ id, message }),
    outMessage: { fold: foldOutMessage },
  })

  const composition = Parent.makeComposition({ childBindings: [ChildBinding] })
  const foldChild = composition.makeUpdate((model, message) =>
    ChildBinding.fold(model, message.id, message.message),
  )

  return { ChildBinding, foldChild, Model, Message }
}

const KeyedGenericParent = makeKeyedGenericParent(
  Schema.Literals(['One', 'Two']),
)

it('infers generic collection items and keys from their source callbacks', () => {
  const { ChildBinding, foldChild, Model } = KeyedGenericParent
  expectTypeOf<Update.GraphModelOf<typeof ChildBinding.fold>>().toEqualTypeOf<
    typeof Model.Type
  >()
  expectTypeOf(ChildBinding.fold)
    .parameter(1)
    .toEqualTypeOf<'first' | 'second'>()
  expectTypeOf(ChildBinding.fold).parameter(2).toEqualTypeOf<ChildMessage>()
  expectTypeOf(ChildBinding.selectValue)
    .parameter(0)
    .toEqualTypeOf<'first' | 'second'>()
  expectTypeOf<
    (typeof Model.Type)['entries'][number]['payload']
  >().toEqualTypeOf<'One' | 'Two'>()

  const model = Model.make({
    entries: [
      { id: 'first', child: ChildModel.make({ value: 'old' }), payload: 'One' },
    ],
  })
  const result = foldChild(
    model,
    KeyedGenericParent.Message.GotChildMessage({
      id: 'first',
      message: ChildMessage.UpdatedValue({ value: 'next' }),
    }),
  )
  expect(Option.getOrThrow(Array.head(result.model.entries))).toEqual({
    id: 'first',
    child: ChildModel.make({ value: 'next' }),
    payload: 'One',
  })
})

if (false) {
  // @ts-expect-error General keyed inference must retain the string key.
  KeyedGenericParent.ChildBinding.selectValue(1)
  // @ts-expect-error A broader policy input must not widen the inferred key.
  KeyedGenericParent.ChildBinding.selectValue('third')
}

const keyedConfigWithExtraField = {
  readAll: (model: ParentModel) => model.entries,
  key: (entry: Entry) => entry.id,
  read: (entry: Entry) => entry.child,
  writeAt: (model: ParentModel) => model,
  toParentMessage: (id: number, message: ChildMessage) =>
    ParentMessage.GotKeyedChildMessage({ id, message }),
  outMessage: { fold: () => (model: ParentModel) => ({ model }) },
  unexpected: true,
}

if (false) {
  // @ts-expect-error Capturing a keyed policy must not accept extra configuration fields.
  Parent.bindChild(ChildBlock, keyedConfigWithExtraField)
}

const Application = defineApplication({
  Model: ParentModel,
  Message: ParentMessage,
})
const ApplicationChildBinding = Application.bindChild(ChildBlock, {
  field: 'child',
  parentMessage: ParentMessage.GotChildMessage,
  outMessage: { fold: foldChildOutMessage },
})
const ApplicationComposition = Application.makeComposition({
  childBindings: [ApplicationChildBinding],
})

const SnapshotMount = Parent.mount('SnapshotMount', {
  messages: [ParentMessage.GotChildMessage],
})
const AlternateSnapshotMount = Parent.mount('AlternateSnapshotMount', {
  messages: [ParentMessage.GotChildMessage],
})

if (false) {
  // @ts-expect-error Every Block completes through a Composition.
  Parent.makeBlock
  // @ts-expect-error The breaking staging API does not retain register aliases.
  Parent.register
  // @ts-expect-error Every Application completes through a Composition.
  Application.makeElement
  // @ts-expect-error An Application Composition does not expose Block completion.
  ApplicationComposition.makeBlock
  // @ts-expect-error A completed child has no child-owned Binding factory.
  ChildBlock.connection
  // @ts-expect-error Keyed Bindings are also created by the parent.
  ChildBlock.keyedConnection

  Parent.bindChild(ChildBlock, {
    field: 'maybeChild',
    parentMessage: ParentMessage.GotChildMessage,
    outMessage: { fold: foldChildOutMessage },
  })

  Parent.bindChild(ChildBlock, {
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    field: 'child',
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    toParentMessage: () => ({ _tag: 'ForeignMessage' }),
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    outMessage: { fold: foldChildOutMessage },
  })

  Parent.makeComposition().makeBlock({
    init: ParentBlock.init,
    update,
    // @ts-expect-error Child operations require registration in the Composition.
    EffectsLayer: Layer.empty,
  })
}

it('creates direct, optional, and keyed Bindings from the parent', () => {
  expect(DirectChildBinding.placement).toBe('child')
  expect(OptionalChildBinding.placement).toBe('optionalChild')
  expect(TaggedChildBinding.placement).toBe('taggedChild')
  expect(KeyedChildBinding.placement).toBe('entries')
  expectTypeOf<
    Update.GraphModelOf<typeof DirectChildBinding.fold>
  >().toEqualTypeOf<ParentModel>()
  expectTypeOf(DirectChildBinding.fold)
    .parameter(1)
    .toEqualTypeOf<ChildMessage>()
  expectTypeOf<
    CommandMessageOfReturn<ReturnType<typeof ExactMessageChildBinding.fold>>
  >().toEqualTypeOf<ReturnType<typeof ParentMessage.GotChildMessage>>()
  expectTypeOf<
    CommandMessageOfReturn<
      ReturnType<typeof ExactCustomMessageChildBinding.fold>
    >
  >().toEqualTypeOf<ReturnType<typeof ParentMessage.GotChildMessage>>()
  expectTypeOf<
    ReturnType<ReturnType<typeof ForwardingChildBinding.selectValue>>
  >().toEqualTypeOf<
    Update.ResultRecipe<
      ParentModel,
      ParentMessage,
      ParentOutMessage,
      never,
      BindingRequirement<'forwardingChild', typeof ChildBlock>
    >
  >()
  expectTypeOf(KeyedChildBinding.fold).parameter(1).toEqualTypeOf<number>()
  expectTypeOf(KeyedChildBinding.fold)
    .parameter(2)
    .toEqualTypeOf<ChildMessage>()
  expectTypeOf<
    Update.GraphModelOf<typeof GenericChoiceBinding.fold>
  >().toEqualTypeOf<GenericParentModel>()
  expect(ApplicationComposition.childBindings).toEqual([
    ApplicationChildBinding,
  ])
})

it('freezes parent-owned Bindings after their private metadata is registered', () => {
  expect(Object.isFrozen(DirectChildBinding)).toBe(true)
  expect(Object.isFrozen(KeyedChildBinding)).toBe(true)
  expect(Reflect.set(DirectChildBinding, 'placement', 'mutated')).toBe(false)
  expect(DirectChildBinding.placement).toBe('child')
})

it('snapshots mutable child and Mount arrays at the Composition boundary', () => {
  const DuplicateChildBinding = Parent.bindChild(ChildBlock, {
    fromParentMessage: false,
    field: 'child',
    parentMessage: ParentMessage.GotChildMessage,
    outMessage: { fold: foldChildOutMessage },
  })
  const suppliedChildBindings: Array<typeof DirectChildBinding> = [
    DirectChildBinding,
  ]
  const suppliedMounts: Array<
    typeof SnapshotMount | typeof AlternateSnapshotMount
  > = [SnapshotMount]
  const composition = Parent.makeComposition({
    childBindings: suppliedChildBindings,
    mounts: suppliedMounts,
  })

  suppliedChildBindings.push(DuplicateChildBinding)
  suppliedMounts.push(AlternateSnapshotMount)
  expect(composition.childBindings).toEqual([DirectChildBinding])
  expect(composition.mounts).toEqual([SnapshotMount])

  suppliedChildBindings.splice(0, 1, DuplicateChildBinding)
  suppliedMounts.splice(0, 1, AlternateSnapshotMount)
  expect(composition.childBindings).toEqual([DirectChildBinding])
  expect(composition.mounts).toEqual([SnapshotMount])

  suppliedChildBindings.pop()
  suppliedMounts.pop()
  expect(composition.childBindings).toEqual([DirectChildBinding])
  expect(composition.mounts).toEqual([SnapshotMount])
  expect(Object.isFrozen(composition.childBindings)).toBe(true)
  expect(Object.isFrozen(composition.mounts)).toBe(true)
})

it('keeps Application Composition snapshots independent from caller arrays', () => {
  const suppliedChildBindings: Array<typeof ApplicationChildBinding> = [
    ApplicationChildBinding,
  ]
  const composition = Application.makeComposition({
    childBindings: suppliedChildBindings,
  })

  suppliedChildBindings.pop()

  expect(composition.childBindings).toEqual([ApplicationChildBinding])
  expect(Object.isFrozen(composition.childBindings)).toBe(true)
})

it('rejects an authentic Binding created by a different parent identity', () => {
  const ForeignParent = define('ParentOwnedBindingForeignParent', {
    Model: ParentModel,
    Message: ParentMessage,
    OutMessage: ParentOutMessage,
  })

  expect(() =>
    ForeignParent.makeComposition({ childBindings: [DirectChildBinding] }),
  ).toThrow(/different parent Definition/)
})

it('keeps child Binding helpers on the Definition after composition', () => {
  const compositionHelper = Parent.makeComposition()
  const DefinitionOwnedChildBinding = Parent.bindChild(ChildBlock, {
    field: 'child',
    placement: 'definitionOwnedChild',
    parentMessage: ParentMessage.GotChildMessage,
    outMessage: { fold: foldChildOutMessage },
  })

  expect(compositionHelper).not.toHaveProperty('bindChild')
  expect(
    Parent.makeComposition({ childBindings: [DefinitionOwnedChildBinding] })
      .childBindings,
  ).toEqual([DefinitionOwnedChildBinding])
})

it('accepts shared named contracts and rejects incompatible contracts from that owner', () => {
  const SharedParent = define('ParentOwnedBindingSharedParent')
  const First = SharedParent.define({
    Model: ParentModel,
    Message: ParentMessage,
    OutMessage: ParentOutMessage,
  })
  const Refined = SharedParent.define({
    Model: ParentModel,
    Message: ParentMessage,
    OutMessage: ParentOutMessage,
  })
  const IncompatibleParentModel = Schema.Struct({
    child: ChildModel,
    unrelated: Schema.String,
  })
  const Incompatible = SharedParent.define({
    Model: IncompatibleParentModel,
    Message: ParentMessage,
    OutMessage: ParentOutMessage,
  })
  const SharedChildBinding = First.bindChild(PlainChildBlock, {
    field: 'child',
    parentMessage: ParentMessage.GotChildMessage,
  })

  expect(
    Refined.makeComposition({ childBindings: [SharedChildBinding] })
      .childBindings,
  ).toEqual([SharedChildBinding])
  expect(() =>
    Reflect.apply(Incompatible.makeComposition, undefined, [
      { childBindings: [SharedChildBinding] },
    ]),
  ).toThrow(/different parent Definition contract/)
})

it('uses only own properties to distinguish Binding config forms', () => {
  const inheritedReadAllConfig = Object.assign(
    Object.create({ readAll: () => [] }),
    {
      placement: 'inheritedReadAll',
      read: (model: ParentModel) => Option.some(model.child),
      write: (model: ParentModel, child: ChildModel) =>
        modifyFields(model, { child: () => child }),
      parentMessage: ParentMessage.GotChildMessage,
    },
  )
  const inheritedMapperConfig = Object.assign(
    Object.create({
      toParentMessage: (_message: ChildMessage) =>
        ParentMessage.GotChildMessage({ message: _message }),
    }),
    {
      placement: 'inheritedMapper',
      read: (model: ParentModel) => Option.some(model.child),
      write: (model: ParentModel, child: ChildModel) =>
        modifyFields(model, { child: () => child }),
      parentMessage: ParentMessage.GotChildMessage,
    },
  )
  const InheritedReadAllBinding = Parent.bindChild(
    PlainChildBlock,
    inheritedReadAllConfig,
  )
  const InheritedMapperBinding = Parent.bindChild(
    PlainChildBlock,
    inheritedMapperConfig,
  )
  const foldInheritedReadAll = Parent.makeComposition({
    childBindings: [InheritedReadAllBinding],
  }).makeUpdate((model, message): Update.Return<ParentModel, ParentMessage> => {
    if (message._tag === 'GotChildMessage') {
      return Reflect.apply(
        Reflect.get(InheritedReadAllBinding, 'fold'),
        InheritedReadAllBinding,
        [model, message.message],
      )
    } else {
      return { model }
    }
  })
  const foldInheritedMapper = Parent.makeComposition({
    childBindings: [InheritedMapperBinding],
  }).makeUpdate((model, message): Update.Return<ParentModel, ParentMessage> => {
    if (message._tag === 'GotChildMessage') {
      return Reflect.apply(
        Reflect.get(InheritedMapperBinding, 'fold'),
        InheritedMapperBinding,
        [model, message.message],
      )
    } else {
      return { model }
    }
  })
  const model = ParentBlock.init().model
  const message = ChildMessage.UpdatedValue({ value: 'updated' })

  const parentMessage = ParentMessage.GotChildMessage({ message })
  const inheritedReadAllResult = foldInheritedReadAll(model, parentMessage)
  const inheritedMapperResult = foldInheritedMapper(model, parentMessage)

  expect(inheritedReadAllResult.model.child.value).toBe('updated')
  expect(inheritedMapperResult.model.child.value).toBe('updated')
})

it('binds an exposed operation named __proto__ as an own property', () => {
  const PrototypeOperationBinding = Parent.bindChild(
    PrototypeOperationChildBlock,
    {
      field: 'child',
      placement: 'prototypeOperation',
      parentMessage: ParentMessage.GotChildMessage,
    },
  )
  const composition = Parent.makeComposition({
    childBindings: [PrototypeOperationBinding],
  })
  const invokePrototypeOperation = Parent.step((_model, value: string) => {
    const boundOperation = Reflect.get(PrototypeOperationBinding, '__proto__')
    return Reflect.apply(boundOperation, PrototypeOperationBinding, [value])
  })
  const runtime = composition.makeBlock({
    init: ParentBlock.init,
    update: composition.makeUpdate(model => ({ model })),
    expose: { invokePrototypeOperation },
  })
  const boundOperation = Reflect.get(PrototypeOperationBinding, '__proto__')
  const result = runtime.expose.invokePrototypeOperation(
    ParentBlock.init().model,
    'safe',
  )

  expect(Object.hasOwn(PrototypeOperationBinding, '__proto__')).toBe(true)
  expect(boundOperation).toBeTypeOf('function')
  expect(result.model.child.value).toBe('safe')
})
