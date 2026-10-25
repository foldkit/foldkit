import { Option, Predicate, Schema, Tuple } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { taggedStruct } from '../schema/index.js'
import { modifyFields } from '../struct/index.js'
import { makeDefinition } from './define.js'
import * as Block from './public.js'

const ChildModel = Schema.Struct({ count: Schema.Number })
const ChildMessage = defineMessageUnion({
  RequestedSetCount: { count: Schema.Number },
  UpdatedCount: { count: Schema.Number },
})
const Child = makeDefinition('DirectPresenceChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
const setCount = Child.makeStep((model, count: number) => ({
  model: modifyFields(model, { count: () => count }),
}))
const ChildComposition = Child.makeComposition()
const prepareChildBlock = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit(() => ({
      model: ChildModel.make({ count: 0 }),
    })),
    update: ChildComposition.makeUpdate({
      RequestedSetCount: (model, { count }) => setCount(model, count),
      UpdatedCount: (model, { count }) => setCount(model, count),
    }),
    operations: {
      setCount: (count: number) =>
        Tuple.make(ChildMessage.RequestedSetCount({ count })),
    },
  })
const childBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)
const Model = Schema.Struct({
  child: ChildModel,
  maybeChild: Schema.Option(ChildModel),
  route: Schema.Literals(['Home', 'Away']),
})
type Model = typeof Model.Type
const Message = defineMessageUnion({
  RequestedSetOptionalCount: { count: Schema.Number },
  RequestedSetGatedCount: { count: Schema.Number },
})
const Parent = makeDefinition('DirectPresenceParent', { Model, Message })
const OptionalBinding = Parent.makeBinding(childBlock, {
  field: 'maybeChild',
})
const GatedBinding = Parent.makeBinding(childBlock, {
  field: 'child',
  presentWhen: model => {
    expectTypeOf(model).toEqualTypeOf<Model>()
    return model.route === 'Home'
  },
})
const composition = Parent.makeComposition({
  bindings: [OptionalBinding, GatedBinding],
})
const update = composition.makeUpdate({
  RequestedSetOptionalCount: (model, { count }) =>
    OptionalBinding.setCount(count)(model),
  RequestedSetGatedCount: (model, { count }) =>
    GatedBinding.setCount(count)(model),
})
const initial = Model.make({
  child: ChildModel.make({ count: 1 }),
  maybeChild: Option.some(ChildModel.make({ count: 2 })),
  route: 'Home',
})

const gatedUpdate = update
const prepareParent = () =>
  composition.prepareBlock({
    init: () => ({ model: initial }),
    update,
    operations: {
      setOptionalCount: (count: number) =>
        Tuple.make(Message.RequestedSetOptionalCount({ count })),
      setGatedCount: (count: number) =>
        Tuple.make(Message.RequestedSetGatedCount({ count })),
    },
  })
const parent: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepareParent
> = Block.assemble(prepareParent)

it('folds exact Option fields without creating absent children', () => {
  expectTypeOf(OptionalBinding.placement).toEqualTypeOf<'maybeChild'>()
  const changed = update(initial, {
    _tag: 'GotMaybeChildMessage',
    placement: 'maybeChild',
    generation: 0,
    message: ChildMessage.UpdatedCount({ count: 3 }),
  })
  expect(changed.model.maybeChild).toEqual(
    Option.some(ChildModel.make({ count: 3 })),
  )
  expect(
    parent.operations.setOptionalCount(initial, 4).model.maybeChild,
  ).toEqual(Option.some(ChildModel.make({ count: 4 })))

  const absent = modifyFields(initial, { maybeChild: () => Option.none() })
  expect(
    update(absent, {
      _tag: 'GotMaybeChildMessage',
      placement: 'maybeChild',
      generation: 0,
      message: ChildMessage.UpdatedCount({ count: 9 }),
    }).model,
  ).toBe(absent)
  expect(parent.operations.setOptionalCount(absent, 9).model).toBe(absent)
})

it('makes direct stored children absent through presentWhen without deleting their state', () => {
  expect(parent.operations.setGatedCount(initial, 3).model.child.count).toBe(3)
  const away: Model = modifyFields(initial, { route: () => 'Away' })
  expect(
    gatedUpdate(away, {
      _tag: 'GotChildMessage',
      placement: 'child',
      generation: 0,
      message: ChildMessage.UpdatedCount({ count: 9 }),
    }).model,
  ).toBe(away)
  expect(parent.operations.setGatedCount(away, 9).model).toBe(away)
  expect(away.child.count).toBe(1)
  const returned = modifyFields(away, { route: () => 'Home' })
  expect(parent.operations.setGatedCount(returned, 5).model.child.count).toBe(5)
})

it('distinguishes Option child Models from optional storage wrappers', () => {
  const OptionModel = Schema.Option(Schema.String)
  const OptionMessage = defineMessageUnion({
    UpdatedText: { text: Schema.String },
  })

  const OptionChildComposition = makeDefinition('DirectPresenceOptionModel', {
    Model: OptionModel,
    Message: OptionMessage,
  }).makeComposition()
  const prepareBlock = () =>
    OptionChildComposition.prepareBlock({
      init: OptionChildComposition.makeInit(() => ({
        model: Option.none<string>(),
      })),
      update: OptionChildComposition.makeUpdate({
        UpdatedText: (_model, { text }) => ({
          model: Option.some(text),
        }),
      }),
    })
  const block: Block.FromAssemblyWithoutViewOrOutMessage<
    typeof OptionModel,
    typeof prepareBlock
  > = Block.assemble(prepareBlock)
  const Model = Schema.Struct({
    required: Schema.Option(Schema.String),
    maybe: Schema.Option(OptionModel),
  })
  const Parent = makeDefinition('DirectPresenceOptionParent', {
    Model,
    Message: Schema.Never,
  })
  const RequiredBinding = Parent.makeBinding(block, {
    field: 'required',
  })
  const OptionalBinding = Parent.makeBinding(block, {
    field: 'maybe',
  })
  const Composition = Parent.makeComposition({
    bindings: [RequiredBinding, OptionalBinding],
  })
  const updateRequired = Composition.makeUpdate({})
  const updateOptional = updateRequired
  const initial = Model.make({ required: Option.none(), maybe: Option.none() })
  expect(
    updateRequired(initial, {
      _tag: 'GotRequiredMessage',
      placement: 'required',
      generation: 0,
      message: OptionMessage.UpdatedText({ text: 'changed' }),
    }).model.required,
  ).toEqual(Option.some('changed'))
  expect(
    updateOptional(initial, {
      _tag: 'GotMaybeMessage',
      placement: 'maybe',
      generation: 0,
      message: OptionMessage.UpdatedText({ text: 'ignored' }),
    }).model,
  ).toBe(initial)
})

it('reports invalid erased direct configurations during binding creation', () => {
  const bind = (config: unknown) =>
    Reflect.apply(Parent.makeBinding, Parent, [childBlock, config])
  expect(() =>
    bind({
      field: 'missing',
    }),
  ).toThrow(/declared Struct Model field/)
  expect(() =>
    bind({
      field: 'child',
      read: () => Option.some(initial.child),
    }),
  ).toThrow(/cannot also supply/)
  expect(() =>
    bind({
      field: 'child',
      write: () => initial,
    }),
  ).toThrow(/cannot also supply/)
  expect(() =>
    bind({
      field: 'child',
      presentWhen: true,
    }),
  ).toThrow(/presentWhen must be/)
  for (const removedField of [
    'parentMessage',
    'toParentMessage',
    'fromParentMessage',
  ]) {
    expect(() => bind({ field: 'child', [removedField]: () => ({}) })).toThrow(
      `Unknown Binding configuration field "${removedField}"`,
    )
  }
})

it('preserves absence through a suspended Option storage schema', () => {
  const SuspendedModel = Schema.Struct({
    maybeChild: Schema.suspend(() => Schema.Option(ChildModel)),
  })
  const Suspended = makeDefinition('DirectPresenceSuspended', {
    Model: SuspendedModel,
    Message: Schema.Never,
  })
  const ChildBinding = Suspended.makeBinding(childBlock, {
    field: 'maybeChild',
  })
  const Composition = Suspended.makeComposition({
    bindings: [ChildBinding],
  })
  const update = Composition.makeUpdate({})
  const absent = SuspendedModel.make({ maybeChild: Option.none() })
  expect(
    update(absent, {
      _tag: 'GotMaybeChildMessage',
      placement: 'maybeChild',
      generation: 0,
      message: ChildMessage.UpdatedCount({ count: 2 }),
    }).model,
  ).toBe(absent)
  const present = SuspendedModel.make({
    maybeChild: Option.some(ChildModel.make({ count: 1 })),
  })
  expect(
    update(present, {
      _tag: 'GotMaybeChildMessage',
      placement: 'maybeChild',
      generation: 0,
      message: ChildMessage.UpdatedCount({ count: 3 }),
    }).model.maybeChild,
  ).toEqual(Option.some(ChildModel.make({ count: 3 })))
})

it('rejects structurally incompatible storage and invalid wrapper constructors before binding', () => {
  const InvalidModel = Schema.Struct({
    number: Schema.Number,
    wrongOption: Schema.Option(Schema.String),
  })
  const Invalid = makeDefinition('DirectPresenceInvalid', {
    Model: InvalidModel,
    Message,
  })
  const bind = (config: unknown) =>
    Reflect.apply(Invalid.makeBinding, Invalid, [childBlock, config])
  for (const field of ['number', 'wrongOption']) {
    expect(() =>
      bind({
        field,
      }),
    ).toThrow(/must store the declared child Model/)
  }

  const bindParent = (config: unknown) =>
    Reflect.apply(Parent.makeBinding, Parent, [childBlock, config])
  expect(() =>
    bindParent({
      field: 'child',
      presentWhem: () => true,
    }),
  ).toThrow(/Unknown Binding configuration field "presentWhem"/)
})

it('rejects nonboolean presence policies from erased callers', () => {
  const bind = (config: unknown) =>
    Reflect.apply(Parent.makeBinding, Parent, [childBlock, config])
  const InvalidPresenceBinding = bind({
    placement: 'invalid-child',
    field: 'child',
    presentWhen: () => 'Home',
    init: false,
  })
  const Composition = Reflect.apply(Parent.makeComposition, undefined, [
    { bindings: [InvalidPresenceBinding, GatedBinding] },
  ])
  const invalidUpdate = Reflect.apply(
    Reflect.get(Composition, 'makeUpdate'),
    undefined,
    [
      {
        RequestedSetOptionalCount: Parent.makeNoopStep(),
        RequestedSetGatedCount: Parent.makeNoopStep(),
      },
    ],
  )

  if (!Predicate.isFunction(invalidUpdate)) {
    throw new Error(
      'Expected the erased Composition to produce an update function',
    )
  }

  expect(() =>
    Reflect.apply(invalidUpdate, undefined, [
      initial,
      {
        _tag: 'GotInvalidChildMessage',
        placement: 'invalid-child',
        generation: 0,
        message: ChildMessage.UpdatedCount({ count: 1 }),
      },
    ]),
  ).toThrow(/must return a boolean/)
})

it('rejects ignored keyed adapters on erased accessor configs', () => {
  const bind = (config: unknown) =>
    Reflect.apply(Parent.makeBinding, Parent, [childBlock, config])
  for (const field of ['Model', 'key', 'writeAt']) {
    expect(() =>
      bind({
        read: (model: Model) => Option.some(model.child),
        write: (model: Model) => model,
        [field]: () => initial,
      }),
    ).toThrow(/accessor Binding cannot supply/)
  }
})

it('reads direct fields from callable tagged Struct parent Models', () => {
  const Model = taggedStruct('CallableParent', {
    child: ChildModel,
    maybeChild: Schema.Option(ChildModel),
  })
  const Parent = makeDefinition('DirectPresenceCallableParent', {
    Model,
    Message,
  })
  const ChildBinding = Parent.makeBinding(childBlock, {
    field: 'child',
  })
  const OptionalBinding = Parent.makeBinding(childBlock, {
    field: 'maybeChild',
  })
  const Composition = Parent.makeComposition({
    bindings: [ChildBinding, OptionalBinding],
  })
  const updateChild = Composition.makeUpdate({
    RequestedSetOptionalCount: model => ({ model }),
    RequestedSetGatedCount: model => ({ model }),
  })
  const updateOptional = updateChild
  const initial = Model({
    child: ChildModel.make({ count: 1 }),
    maybeChild: Option.none(),
  })
  expect(
    updateChild(initial, {
      _tag: 'GotChildMessage',
      placement: 'child',
      generation: 0,
      message: ChildMessage.UpdatedCount({ count: 2 }),
    }).model,
  ).toEqual(
    Model({ child: ChildModel.make({ count: 2 }), maybeChild: Option.none() }),
  )
  expect(
    updateOptional(initial, {
      _tag: 'GotMaybeChildMessage',
      placement: 'maybeChild',
      generation: 0,
      message: ChildMessage.UpdatedCount({ count: 2 }),
    }).model,
  ).toBe(initial)
})

it('rejects ignored Model overrides on parent-owned direct fields', () => {
  for (const field of ['Model', 'ChildModel']) {
    expect(() =>
      Reflect.apply(Parent.makeBinding, Parent, [
        childBlock,
        {
          field: 'child',
          [field]: Schema.String,
        },
      ]),
    ).toThrow(/parent-owned field Binding cannot supply/)
  }
})
