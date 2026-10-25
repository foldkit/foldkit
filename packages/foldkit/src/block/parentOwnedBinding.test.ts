import { Array, Layer, Option, Schema, Tuple } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import type * as Update from '../update/index.js'
import type { RequirementOfBinding } from './binding.js'
import type { ChildEnvelope } from './childEnvelope.js'
import type { DeferredBindingPolicy } from './deferredPolicy.js'
import { makeDefinition, makeNamespace } from './define.js'
import * as Block from './public.js'

const ChildModel = Schema.Struct({ value: Schema.String })
type ChildModel = typeof ChildModel.Type
const ChildMessage = defineMessageUnion({
  RequestedSelectValue: {},
  RequestedSetPrototypeValue: { value: Schema.String },
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

const Child = makeDefinition('ParentOwnedBindingChild', {
  Model: ChildModel,
  Message: ChildMessage,
  OutMessage: ChildOutMessage,
})
const selectValue = Child.makeStep(model => ({
  model,
  outMessage: ChildOutMessage.SelectedValue({ value: model.value }),
}))
const ChildComposition = Child.makeComposition()
const prepareChildBlock = () =>
  ChildComposition.prepareBlock({
    init: () => ({ model: ChildModel.make({ value: 'initial' }) }),
    update: ChildComposition.makeUpdate({
      RequestedSelectValue: model => selectValue(model),
      RequestedSetPrototypeValue: model => ({ model }),
      UpdatedValue: (model, { value }) => ({
        model: modifyFields(model, { value: () => value }),
      }),
    }),
    operations: {
      selectValue: () => Tuple.make(ChildMessage.RequestedSelectValue()),
    },
  })
const ChildBlock: Block.FromAssemblyWithOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

const PlainChild = makeDefinition('ParentOwnedBindingPlainChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
const PlainChildComposition = PlainChild.makeComposition()
const setPrototypeValue = PlainChild.makeStep((model, value: string) => ({
  model: modifyFields(model, { value: () => value }),
}))
const preparePlainChildBlock = () =>
  PlainChildComposition.prepareBlock({
    init: () => ({ model: ChildModel.make({ value: 'initial' }) }),
    update: PlainChildComposition.makeUpdate({
      RequestedSelectValue: model => ({ model }),
      RequestedSetPrototypeValue: (model, { value }) =>
        setPrototypeValue(model, value),
      UpdatedValue: (model, { value }) => ({
        model: modifyFields(model, { value: () => value }),
      }),
    }),
  })
const PlainChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof preparePlainChildBlock
> = Block.assemble(preparePlainChildBlock)

const preparePrototypeOperationChildBlock = () =>
  PlainChildComposition.prepareBlock({
    init: PlainChildBlock.init,
    update: PlainChildBlock.update,
    operations: {
      ['__proto__']: (value: string) =>
        Tuple.make(ChildMessage.RequestedSetPrototypeValue({ value })),
    },
  })
const PrototypeOperationChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof preparePrototypeOperationChildBlock
> = Block.assemble(preparePrototypeOperationChildBlock)

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
type ParentMessage = never
const ParentOutMessage = defineMessageUnion({
  ForwardedSelectedValue: { value: Schema.String },
})
type ParentOutMessage = typeof ParentOutMessage.Type

const Parent = makeDefinition('ParentOwnedBindingParent', {
  Model: ParentModel,
  Message: Schema.Never,
  OutMessage: ParentOutMessage,
})

const ExactMessageChildBinding = Parent.makeBinding(PlainChildBlock, {
  field: 'child',
  placement: 'exactMessageChild',
})

const ExactCustomMessageChildBinding = Parent.makeBinding(PlainChildBlock, {
  placement: 'exactCustomMessageChild',
  field: 'maybeChild',
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

const DirectChildBinding = Parent.makeBinding(ChildBlock, {
  field: 'child',
  init: false,
}).withOutMessagePolicy({ fold: foldChildOutMessage })

const ForwardingChildBinding = Parent.makeBinding(ChildBlock, {
  field: 'child',
  placement: 'forwardingChild',
}).withOutMessagePolicy({
  forward: outMessage => {
    expectTypeOf(outMessage).toEqualTypeOf<ChildOutMessage>()

    return ChildOutMessage.match<ParentOutMessage>(outMessage, {
      SelectedValue: ({ value }) =>
        ParentOutMessage.ForwardedSelectedValue({ value }),
    })
  },
})

const OptionalChildBinding = Parent.makeBinding(ChildBlock, {
  placement: 'optionalChild',
  read: model => model.maybeChild,
  write: (model, nextChild) =>
    modifyFields(model, { maybeChild: () => Option.some(nextChild) }),
}).withOutMessagePolicy({
  fold: (outMessage, context) => {
    expectTypeOf(outMessage).toEqualTypeOf<ChildOutMessage>()
    expectTypeOf(context).toEqualTypeOf<
      Update.FoldContext<ChildMessage, ParentMessage, ParentModel>
    >()

    return foldChildOutMessage(outMessage)
  },
})

const TaggedChildBinding = Parent.makeBinding(ChildBlock, {
  placement: 'taggedChild',
  read: model =>
    model.slot._tag === 'Child' ? Option.some(model.slot.child) : Option.none(),
  write: (model, nextChild) =>
    modifyFields(model, {
      slot: () => ChildSlot.make({ child: nextChild }),
    }),
}).withOutMessagePolicy({ fold: foldChildOutMessage })

const KeyedChildBinding = Parent.makeBinding(ChildBlock, {
  placement: 'entries',
  readAll: model => model.entries,
  key: entry => entry.id,
  keySchema: Schema.Number,
  read: entry => entry.child,
  writeAt: (model, id, nextChild) =>
    modifyFields(model, {
      entries: Array.map(entry =>
        entry.id === id
          ? Entry.make({ id: entry.id, child: nextChild })
          : entry,
      ),
    }),
}).withOutMessagePolicy({
  fold: (id, outMessage, context) => {
    expectTypeOf(id).toEqualTypeOf<number>()
    expectTypeOf(outMessage).toEqualTypeOf<ChildOutMessage>()
    expectTypeOf(context).toEqualTypeOf<
      Update.FoldContext<ChildMessage, ParentMessage, ParentModel>
    >()

    return foldChildOutMessage(outMessage)
  },
})

const ParentComposition = Parent.makeComposition({
  bindings: [
    DirectChildBinding,
    OptionalChildBinding,
    TaggedChildBinding,
    KeyedChildBinding,
  ],
})

const update = ParentComposition.makeUpdate({})

const prepareParentBlock = () =>
  ParentComposition.prepareBlock({
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
const ParentBlock: Block.FromAssemblyWithOutMessage<
  typeof ParentModel,
  typeof prepareParentBlock
> = Block.assemble(prepareParentBlock)

const makeGenericChoice = <const Value extends string>(
  Value: Schema.Schema<Value>,
) => {
  const Model = Schema.Struct({ value: Value })
  const Message = defineMessageUnion({ UpdatedChoice: { value: Value } })
  const OutMessage = defineMessageUnion({ SelectedChoice: { value: Value } })

  const GenericChoiceComposition = makeNamespace('ParentOwnedGenericChoice')
    .makeDefinition({
      Model,
      Message,
      OutMessage,
    })
    .makeComposition()
  const prepareBlock = () =>
    GenericChoiceComposition.prepareBlock({
      init: (value: Value) => ({ model: Model.make({ value }) }),
      update: GenericChoiceComposition.makeUpdate({
        UpdatedChoice: (model, { value }) => ({
          model: modifyFields(model, { value: () => value }),
        }),
      }),
    })
  const block: Block.FromAssemblyWithOutMessage<
    typeof Model,
    typeof prepareBlock
  > = Block.assemble(prepareBlock)

  return { block, Message, OutMessage }
}

const GenericChoice = makeGenericChoice(Schema.Literals(['One', 'Two']))
const GenericParentModel = Schema.Struct({ choice: GenericChoice.block.Model })
type GenericParentModel = typeof GenericParentModel.Type
const GenericParent = makeDefinition('ParentOwnedGenericParent', {
  Model: GenericParentModel,
  Message: Schema.Never,
})
const foldGenericChoiceOutMessage = GenericParent.makeOutMessageFold(
  GenericChoice.block,
  {
    SelectedChoice:
      ({ value }) =>
      model => {
        expectTypeOf(value).toEqualTypeOf<'One' | 'Two'>()
        return { model }
      },
  },
)
const GenericChoiceBinding = GenericParent.makeBinding(GenericChoice.block, {
  field: 'choice',
  init: false,
}).withOutMessagePolicy({
  fold: foldGenericChoiceOutMessage,
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
  const Parent = makeDefinition('ParentOwnedKeyedGenericParent', {
    Model,
    Message: Schema.Never,
  })
  const foldOutMessage = (id: string, outMessage: ChildOutMessage) =>
    ChildOutMessage.match<Update.Step<typeof Model.Type, never>>(outMessage, {
      SelectedValue: () => model => {
        expectTypeOf(id).toEqualTypeOf<string>()
        return { model }
      },
    })
  const ChildBinding = Parent.makeBinding(ChildBlock, {
    readAll: model => model.entries,
    key: entry => {
      const payload: Value = entry.payload
      void payload
      return entry.id
    },
    keySchema: Entry.fields.id,
    read: entry => entry.child,
    writeAt: (model, id, nextChild) =>
      modifyFields(model, {
        entries: Array.map(entry =>
          entry.id === id
            ? modifyFields(entry, { child: () => nextChild })
            : entry,
        ),
      }),
  }).withOutMessagePolicy({ fold: foldOutMessage })

  const composition = Parent.makeComposition({ bindings: [ChildBinding] })
  const foldChild = composition.makeUpdate({})

  return { ChildBinding, foldChild, Model }
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
  const result = foldChild(model, {
    _tag: 'GotParentOwnedBindingChildMessage',
    placement: 'ParentOwnedBindingChild',
    generation: 0,
    key: 'first',
    message: ChildMessage.UpdatedValue({ value: 'next' }),
  })
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
  keySchema: Schema.Number,
  writeAt: (model: ParentModel) => model,
  outMessage: { fold: () => (model: ParentModel) => ({ model }) },
  unexpected: true,
}

if (false) {
  // @ts-expect-error Capturing a keyed policy must not accept extra configuration fields.
  Parent.makeBinding(ChildBlock, keyedConfigWithExtraField)
}

const SingleParentMessage = defineMessageUnion({
  RequestedInvokePrototypeOperation: { value: Schema.String },
})
const ApplicationDefinition = Block.makeDefinition('Application', {
  Model: ParentModel,
  Message: SingleParentMessage,
})
const ApplicationChildBinding = ApplicationDefinition.makeBinding(ChildBlock, {
  field: 'child',
}).withOutMessagePolicy({
  fold: () => ApplicationDefinition.makeStep(model => ({ model })),
})
const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [ApplicationChildBinding],
})

const SnapshotParent = makeDefinition('ParentOwnedSnapshotParent', {
  Model: ParentModel,
  Message: SingleParentMessage,
})
const SnapshotChildBinding = SnapshotParent.makeBinding(PlainChildBlock, {
  field: 'child',
})
const SnapshotMount = SnapshotParent.makeMount('SnapshotMount', {
  messages: [SingleParentMessage.RequestedInvokePrototypeOperation],
})
const AlternateSnapshotMount = SnapshotParent.makeMount(
  'AlternateSnapshotMount',
  {
    messages: [SingleParentMessage.RequestedInvokePrototypeOperation],
  },
)

if (false) {
  // @ts-expect-error Every Block completes through a Composition.
  Parent.prepareBlock
  // @ts-expect-error The breaking staging API does not retain register aliases.
  Parent.register
  // @ts-expect-error Every Block completes through a Composition.
  ApplicationDefinition.prepareBlock
  void ApplicationComposition.prepareBlock
  // @ts-expect-error A completed child has no child-owned Binding factory.
  ChildBlock.connection
  // @ts-expect-error Keyed Bindings are also created by the parent.
  ChildBlock.keyedConnection

  Parent.makeBinding(ChildBlock, {
    field: 'maybeChild',
  }).withOutMessagePolicy({ fold: foldChildOutMessage })

  const AlternativeChildBinding = Parent.makeBinding(ChildBlock, {
    field: 'child',
    placement: 'alternative',
  }).withOutMessagePolicy({ fold: foldChildOutMessage })
  const AlternativeParentComposition = Parent.makeComposition({
    bindings: [
      AlternativeChildBinding,
      OptionalChildBinding,
      TaggedChildBinding,
      KeyedChildBinding,
    ],
  })
  AlternativeParentComposition.prepareBlock({
    // @ts-expect-error A completed Block's init is bound to its registered child placements.
    init: ParentBlock.init,
    // @ts-expect-error A completed Block's update is bound to its registered child placements.
    update,
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
  >().toEqualTypeOf<ChildEnvelope<'exactMessageChild', ChildMessage>>()
  expectTypeOf<
    CommandMessageOfReturn<
      ReturnType<typeof ExactCustomMessageChildBinding.fold>
    >
  >().toEqualTypeOf<ChildEnvelope<'exactCustomMessageChild', ChildMessage>>()
  expectTypeOf<
    ReturnType<ReturnType<typeof ForwardingChildBinding.selectValue>>
  >().toEqualTypeOf<
    Update.ResultRecipe<
      ParentModel,
      ChildEnvelope<'forwardingChild', ChildMessage>,
      never,
      never,
      | RequirementOfBinding<typeof ForwardingChildBinding>
      | Update.DeferredResultEvidence<
          DeferredBindingPolicy<'forwardingChild', 'ParentOwnedBindingChild'>
        >
    >
  >()
  expectTypeOf(KeyedChildBinding.fold).parameter(1).toEqualTypeOf<number>()
  expectTypeOf(KeyedChildBinding.fold)
    .parameter(2)
    .toEqualTypeOf<ChildMessage>()
  expectTypeOf<
    Update.GraphModelOf<typeof GenericChoiceBinding.fold>
  >().toEqualTypeOf<GenericParentModel>()
  expect(ApplicationComposition.bindings).toEqual([ApplicationChildBinding])
})

it('freezes parent-owned Bindings after their private metadata is registered', () => {
  expect(Object.isFrozen(DirectChildBinding)).toBe(true)
  expect(Object.isFrozen(KeyedChildBinding)).toBe(true)
  expect(Reflect.set(DirectChildBinding, 'placement', 'mutated')).toBe(false)
  expect(DirectChildBinding.placement).toBe('child')
})

it('snapshots mutable child and Mount arrays at the Composition boundary', () => {
  const DuplicateChildBinding = SnapshotParent.makeBinding(PlainChildBlock, {
    field: 'child',
  })
  const suppliedChildBindings: Array<typeof SnapshotChildBinding> = [
    SnapshotChildBinding,
  ]
  const suppliedMounts: Array<
    typeof SnapshotMount | typeof AlternateSnapshotMount
  > = [SnapshotMount]
  const composition = SnapshotParent.makeComposition({
    bindings: suppliedChildBindings,
    mounts: suppliedMounts,
  })

  suppliedChildBindings.push(DuplicateChildBinding)
  suppliedMounts.push(AlternateSnapshotMount)
  expect(composition.bindings).toEqual([SnapshotChildBinding])
  expect(composition.mounts).toEqual([SnapshotMount])

  suppliedChildBindings.splice(0, 1, DuplicateChildBinding)
  suppliedMounts.splice(0, 1, AlternateSnapshotMount)
  expect(composition.bindings).toEqual([SnapshotChildBinding])
  expect(composition.mounts).toEqual([SnapshotMount])

  suppliedChildBindings.pop()
  suppliedMounts.pop()
  expect(composition.bindings).toEqual([SnapshotChildBinding])
  expect(composition.mounts).toEqual([SnapshotMount])
  expect(Object.isFrozen(composition.bindings)).toBe(true)
  expect(Object.isFrozen(composition.mounts)).toBe(true)
})

it('keeps root Composition snapshots independent from caller arrays', () => {
  const suppliedChildBindings: Array<typeof ApplicationChildBinding> = [
    ApplicationChildBinding,
  ]
  const composition = ApplicationDefinition.makeComposition({
    bindings: suppliedChildBindings,
  })

  suppliedChildBindings.pop()

  expect(composition.bindings).toEqual([ApplicationChildBinding])
  expect(Object.isFrozen(composition.bindings)).toBe(true)
})

it('rejects an authentic Binding created by a different parent identity', () => {
  const ParentOwnedBindingForeignParentDefinition = makeDefinition(
    'ParentOwnedBindingForeignParent',
    {
      Model: ParentModel,
      Message: Schema.Never,
      OutMessage: ParentOutMessage,
    },
  )

  expect(() =>
    ParentOwnedBindingForeignParentDefinition.makeComposition({
      bindings: [
        DirectChildBinding,
        OptionalChildBinding,
        TaggedChildBinding,
        KeyedChildBinding,
      ],
    }),
  ).toThrow(/different parent Definition/)
})

it('keeps child Binding helpers on the Definition after composition', () => {
  const compositionHelper = ParentComposition
  const DefinitionOwnedChildBinding = Parent.makeBinding(ChildBlock, {
    field: 'child',
    placement: 'definitionOwnedChild',
  }).withOutMessagePolicy({ fold: foldChildOutMessage })

  expect(compositionHelper).not.toHaveProperty('makeBinding')
  expect(
    Parent.makeComposition({
      bindings: [
        DefinitionOwnedChildBinding,
        OptionalChildBinding,
        TaggedChildBinding,
        KeyedChildBinding,
      ],
    }).bindings,
  ).toEqual([
    DefinitionOwnedChildBinding,
    OptionalChildBinding,
    TaggedChildBinding,
    KeyedChildBinding,
  ])
})

it('accepts shared named contracts and rejects incompatible contracts from that owner', () => {
  const SharedParentNamespace = makeNamespace('ParentOwnedBindingSharedParent')
  const FirstDefinition = SharedParentNamespace.makeDefinition({
    Model: ParentModel,
    Message: SingleParentMessage,
    OutMessage: ParentOutMessage,
  })

  const IncompatibleParentModel = Schema.Struct({
    child: ChildModel,
    unrelated: Schema.String,
  })
  const IncompatibleDefinition = SharedParentNamespace.makeDefinition({
    Model: IncompatibleParentModel,
    Message: SingleParentMessage,
    OutMessage: ParentOutMessage,
  })
  const SharedChildBinding = FirstDefinition.makeBinding(PlainChildBlock, {
    field: 'child',
  })

  expect(
    SharedParentNamespace.makeDefinition({
      Model: ParentModel,
      Message: SingleParentMessage,
      OutMessage: ParentOutMessage,
    }).makeComposition({ bindings: [SharedChildBinding] }).bindings,
  ).toEqual([SharedChildBinding])
  expect(() =>
    Reflect.apply(IncompatibleDefinition.makeComposition, undefined, [
      { bindings: [SharedChildBinding] },
    ]),
  ).toThrow(/different parent Definition contract/)
})

it('uses only own properties to distinguish Binding config forms', () => {
  const inheritedReadAllConfig = {
    placement: 'inheritedReadAll',
    read: (model: ParentModel) => Option.some(model.child),
    write: (model: ParentModel, child: ChildModel) =>
      modifyFields(model, { child: () => child }),
  }
  Object.setPrototypeOf(inheritedReadAllConfig, { readAll: () => [] })
  const inheritedMapperConfig = {
    placement: 'inheritedMapper',
    read: (model: ParentModel) => Option.some(model.child),
    write: (model: ParentModel, child: ChildModel) =>
      modifyFields(model, { child: () => child }),
  }
  Object.setPrototypeOf(inheritedMapperConfig, {
    toParentMessage: (_message: ChildMessage) => _message,
  })
  const InheritedReadAllBinding = SnapshotParent.makeBinding(
    PlainChildBlock,
    inheritedReadAllConfig,
  )
  const InheritedMapperBinding = SnapshotParent.makeBinding(
    PlainChildBlock,
    inheritedMapperConfig,
  )
  const foldInheritedReadAll = Reflect.apply(
    SnapshotParent.makeComposition,
    SnapshotParent,
    [{ bindings: [InheritedReadAllBinding] }],
  ).makeUpdate({})
  const foldInheritedMapper = Reflect.apply(
    SnapshotParent.makeComposition,
    SnapshotParent,
    [{ bindings: [InheritedMapperBinding] }],
  ).makeUpdate({})
  const model = ParentBlock.init().model
  const message = ChildMessage.UpdatedValue({ value: 'updated' })

  const inheritedReadAllResult = foldInheritedReadAll(model, {
    _tag: 'GotInheritedReadAllMessage',
    placement: 'inheritedReadAll',
    generation: 0,
    message,
  })
  const inheritedMapperResult = foldInheritedMapper(model, {
    _tag: 'GotInheritedMapperMessage',
    placement: 'inheritedMapper',
    generation: 0,
    message,
  })

  expect(inheritedReadAllResult.model.child.value).toBe('updated')
  expect(inheritedMapperResult.model.child.value).toBe('updated')
})

it('binds an exposed operation named __proto__ as an own property', () => {
  const PrototypeOperationBinding = SnapshotParent.makeBinding(
    PrototypeOperationChildBlock,
    {
      field: 'child',
      placement: 'prototypeOperation',
    },
  )
  const composition = SnapshotParent.makeComposition({
    bindings: [PrototypeOperationBinding],
  })
  const invokePrototypeOperation = SnapshotParent.makeStep(
    (_model, value: string) => {
      const boundOperation = Reflect.get(PrototypeOperationBinding, '__proto__')
      return Reflect.apply(boundOperation, PrototypeOperationBinding, [value])
    },
  )
  const prepareRuntime = () =>
    composition.prepareBlock({
      init: composition.makeInit(() => ({
        model: {
          maybeChild: Option.none(),
          slot: EmptySlot.make({}),
          entries: [],
          selected: Option.none(),
        },
      })),
      update: composition.makeUpdate({
        RequestedInvokePrototypeOperation: (model, { value }) =>
          invokePrototypeOperation(model, value),
      }),
      operations: {
        invokePrototypeOperation: (value: string) =>
          Tuple.make(
            SingleParentMessage.RequestedInvokePrototypeOperation({ value }),
          ),
      },
    })
  const runtime: Block.FromAssemblyWithoutViewOrOutMessage<
    typeof ParentModel,
    typeof prepareRuntime
  > = Block.assemble(prepareRuntime)
  const boundOperation = Reflect.get(PrototypeOperationBinding, '__proto__')
  const result = runtime.operations.invokePrototypeOperation(
    ParentBlock.init().model,
    'safe',
  )

  expect(Object.hasOwn(PrototypeOperationBinding, '__proto__')).toBe(true)
  expect(boundOperation).toBeTypeOf('function')
  expect(result.model.child.value).toBe('safe')
})
