import { Option, Predicate, Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { taggedStruct } from '../schema/index.js'
import { modifyFields } from '../struct/index.js'
import { define } from './define.js'

const ChildModel = Schema.Struct({ count: Schema.Number })
const ChildMessage = defineMessageUnion({
  UpdatedCount: { count: Schema.Number },
})
const Child = define('DirectPresenceChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
const setCount = Child.step((model, count: number) => ({
  model: modifyFields(model, { count: () => count }),
}))
const ChildComposition = Child.makeComposition()
const childBlock = ChildComposition.makeBlock({
  init: ChildComposition.makeInit(() => ({
    model: ChildModel.make({ count: 0 }),
  })),
  update: ChildComposition.makeUpdate((model, { count }) =>
    setCount(model, count),
  ),
  expose: { setCount },
})
const Model = Schema.Struct({
  child: ChildModel,
  maybeChild: Schema.Option(ChildModel),
  route: Schema.Literals(['Home', 'Away']),
})
type Model = typeof Model.Type
const Message = defineMessageUnion({
  GotChildMessage: { message: ChildMessage },
})
const Parent = define('DirectPresenceParent', { Model, Message })
const OptionalBinding = Parent.bindChild(childBlock, {
  field: 'maybeChild',
  fromParentMessage: false,
  parentMessage: Message.GotChildMessage,
})
const GatedBinding = Parent.bindChild(childBlock, {
  field: 'child',
  presentWhen: model => {
    expectTypeOf(model).toEqualTypeOf<Model>()
    return model.route === 'Home'
  },
  fromParentMessage: false,
  parentMessage: Message.GotChildMessage,
})
const composition = Parent.makeComposition({
  childBindings: [OptionalBinding, GatedBinding],
})
const update = composition.makeUpdate((model, message) =>
  Message.match(message, {
    GotChildMessage: ({ message }) => OptionalBinding.fold(model, message),
  }),
)
const initial = Model.make({
  child: ChildModel.make({ count: 1 }),
  maybeChild: Option.some(ChildModel.make({ count: 2 })),
  route: 'Home',
})

const gatedUpdate = composition.makeUpdate((model, { message }) =>
  GatedBinding.fold(model, message),
)
const parent = composition.makeBlock({
  init: () => ({ model: initial }),
  update,
  expose: {
    setOptionalCount: Parent.step((_model, count: number) =>
      OptionalBinding.setCount(count),
    ),
    setGatedCount: Parent.step((_model, count: number) =>
      GatedBinding.setCount(count),
    ),
  },
})

it('folds exact Option fields without creating absent children', () => {
  expectTypeOf(OptionalBinding.placement).toEqualTypeOf<'maybeChild'>()
  const changed = update(
    initial,
    Message.GotChildMessage({
      message: ChildMessage.UpdatedCount({ count: 3 }),
    }),
  )
  expect(changed.model.maybeChild).toEqual(
    Option.some(ChildModel.make({ count: 3 })),
  )
  expect(parent.expose.setOptionalCount(initial, 4).model.maybeChild).toEqual(
    Option.some(ChildModel.make({ count: 4 })),
  )

  const absent = modifyFields(initial, { maybeChild: () => Option.none() })
  expect(
    update(
      absent,
      Message.GotChildMessage({
        message: ChildMessage.UpdatedCount({ count: 9 }),
      }),
    ).model,
  ).toBe(absent)
  expect(parent.expose.setOptionalCount(absent, 9).model).toBe(absent)
})

it('makes direct stored children absent through presentWhen without deleting their state', () => {
  expect(parent.expose.setGatedCount(initial, 3).model.child.count).toBe(3)
  const away: Model = modifyFields(initial, { route: () => 'Away' })
  expect(
    gatedUpdate(
      away,
      Message.GotChildMessage({
        message: ChildMessage.UpdatedCount({ count: 9 }),
      }),
    ).model,
  ).toBe(away)
  expect(parent.expose.setGatedCount(away, 9).model).toBe(away)
  expect(away.child.count).toBe(1)
  const returned = modifyFields(away, { route: () => 'Home' })
  expect(parent.expose.setGatedCount(returned, 5).model.child.count).toBe(5)
})

it('distinguishes Option child Models from optional storage wrappers', () => {
  const OptionModel = Schema.Option(Schema.String)
  const OptionMessage = defineMessageUnion({
    UpdatedText: { text: Schema.String },
  })
  const OptionChild = define('DirectPresenceOptionModel', {
    Model: OptionModel,
    Message: OptionMessage,
  })
  const OptionChildComposition = OptionChild.makeComposition()
  const block = OptionChildComposition.makeBlock({
    init: OptionChildComposition.makeInit(() => ({
      model: Option.none<string>(),
    })),
    update: OptionChildComposition.makeUpdate((_model, { text }) => ({
      model: Option.some(text),
    })),
  })
  const Model = Schema.Struct({
    required: Schema.Option(Schema.String),
    maybe: Schema.Option(OptionModel),
  })
  const Message = defineMessageUnion({
    GotChildMessage: { message: OptionMessage },
  })
  const Parent = define('DirectPresenceOptionParent', { Model, Message })
  const RequiredBinding = Parent.bindChild(block, {
    field: 'required',
    fromParentMessage: false,
    parentMessage: Message.GotChildMessage,
  })
  const OptionalBinding = Parent.bindChild(block, {
    field: 'maybe',
    fromParentMessage: false,
    parentMessage: Message.GotChildMessage,
  })
  const Composition = Parent.makeComposition({
    childBindings: [RequiredBinding, OptionalBinding],
  })
  const updateRequired = Composition.makeUpdate((model, { message }) =>
    RequiredBinding.fold(model, message),
  )
  const updateOptional = Composition.makeUpdate((model, { message }) =>
    OptionalBinding.fold(model, message),
  )
  const initial = Model.make({ required: Option.none(), maybe: Option.none() })
  expect(
    updateRequired(
      initial,
      Message.GotChildMessage({
        message: OptionMessage.UpdatedText({ text: 'changed' }),
      }),
    ).model.required,
  ).toEqual(Option.some('changed'))
  expect(
    updateOptional(
      initial,
      Message.GotChildMessage({
        message: OptionMessage.UpdatedText({ text: 'ignored' }),
      }),
    ).model,
  ).toBe(initial)
})

it('reports invalid erased direct configurations during binding creation', () => {
  const bind = (config: unknown) =>
    Reflect.apply(Parent.bindChild, Parent, [childBlock, config])
  expect(() =>
    bind({
      field: 'missing',
      fromParentMessage: false,
      parentMessage: Message.GotChildMessage,
    }),
  ).toThrow(/declared Struct Model field/)
  expect(() =>
    bind({
      field: 'child',
      read: () => Option.some(initial.child),
      fromParentMessage: false,
      parentMessage: Message.GotChildMessage,
    }),
  ).toThrow(/cannot also supply/)
  expect(() =>
    bind({
      field: 'child',
      write: () => initial,
      fromParentMessage: false,
      parentMessage: Message.GotChildMessage,
    }),
  ).toThrow(/cannot also supply/)
  expect(() =>
    bind({
      field: 'child',
      presentWhen: true,
      fromParentMessage: false,
      parentMessage: Message.GotChildMessage,
    }),
  ).toThrow(/presentWhen must be/)
  expect(() => bind({ field: 'child', fromParentMessage: false })).toThrow(
    /parentMessage constructor or a toParentMessage function/,
  )
  expect(() =>
    bind({
      field: 'child',
      fromParentMessage: false,
      parentMessage: Message.GotChildMessage,
      toParentMessage: () =>
        Message.GotChildMessage({
          message: ChildMessage.UpdatedCount({ count: 0 }),
        }),
    }),
  ).toThrow(/exactly one/)
})

it('preserves absence through a suspended Option storage schema', () => {
  const SuspendedModel = Schema.Struct({
    maybeChild: Schema.suspend(() => Schema.Option(ChildModel)),
  })
  const Suspended = define('DirectPresenceSuspended', {
    Model: SuspendedModel,
    Message,
  })
  const ChildBinding = Suspended.bindChild(childBlock, {
    field: 'maybeChild',
    fromParentMessage: false,
    parentMessage: Message.GotChildMessage,
  })
  const Composition = Suspended.makeComposition({
    childBindings: [ChildBinding],
  })
  const update = Composition.makeUpdate((model, { message }) =>
    ChildBinding.fold(model, message),
  )
  const absent = SuspendedModel.make({ maybeChild: Option.none() })
  expect(
    update(
      absent,
      Message.GotChildMessage({
        message: ChildMessage.UpdatedCount({ count: 2 }),
      }),
    ).model,
  ).toBe(absent)
  const present = SuspendedModel.make({
    maybeChild: Option.some(ChildModel.make({ count: 1 })),
  })
  expect(
    update(
      present,
      Message.GotChildMessage({
        message: ChildMessage.UpdatedCount({ count: 3 }),
      }),
    ).model.maybeChild,
  ).toEqual(Option.some(ChildModel.make({ count: 3 })))
})

it('rejects structurally incompatible storage and invalid wrapper constructors before binding', () => {
  const InvalidModel = Schema.Struct({
    number: Schema.Number,
    wrongOption: Schema.Option(Schema.String),
  })
  const Invalid = define('DirectPresenceInvalid', {
    Model: InvalidModel,
    Message,
  })
  const bind = (config: unknown) =>
    Reflect.apply(Invalid.bindChild, Invalid, [childBlock, config])
  for (const field of ['number', 'wrongOption']) {
    expect(() =>
      bind({
        field,
        fromParentMessage: false,
        parentMessage: Message.GotChildMessage,
      }),
    ).toThrow(/must store the declared child Model/)
  }

  const bindParent = (config: unknown) =>
    Reflect.apply(Parent.bindChild, Parent, [childBlock, config])
  const Wrappers = defineMessageUnion({
    GotOptionalExtraMessage: {
      message: ChildMessage,
      requestId: Schema.optionalKey(Schema.String),
    },
    GotWrongMessage: { message: Schema.String },
  })
  expect(() =>
    bindParent({
      field: 'child',
      fromParentMessage: false,
      parentMessage: () => ({}),
    }),
  ).toThrow(/callable Message Schema/)
  expect(() =>
    bindParent({
      field: 'child',
      fromParentMessage: false,
      parentMessage: Wrappers.GotOptionalExtraMessage,
    }),
  ).toThrow(/only the message payload/)
  expect(() =>
    bindParent({
      field: 'child',
      fromParentMessage: false,
      parentMessage: Wrappers.GotWrongMessage,
    }),
  ).toThrow(/bound child Message Schema/)
  expect(() =>
    bindParent({
      field: 'child',
      presentWhem: () => true,
      fromParentMessage: false,
      parentMessage: Message.GotChildMessage,
    }),
  ).toThrow(/Unknown Binding configuration field "presentWhem"/)
})

it('rejects erased foreign wrappers and nonboolean presence policies', () => {
  const bind = (config: unknown) =>
    Reflect.apply(Parent.bindChild, Parent, [childBlock, config])
  const Foreign = defineMessageUnion({
    ReceivedChildMessage: { message: ChildMessage },
  })
  expect(() =>
    bind({
      field: 'child',
      fromParentMessage: false,
      parentMessage: Foreign.ReceivedChildMessage,
    }),
  ).toThrow(/declared by the parent Message Schema/)
  const spoof = (_fields: unknown) => ({})
  Reflect.setPrototypeOf(spoof, Message.GotChildMessage)
  expect(() =>
    bind({ field: 'child', fromParentMessage: false, parentMessage: spoof }),
  ).toThrow(/callable Message Schema/)
  const InvalidPresenceBinding = bind({
    field: 'child',
    presentWhen: () => 'Home',
    fromParentMessage: false,
    parentMessage: Message.GotChildMessage,
  })
  const fold = Reflect.get(InvalidPresenceBinding, 'fold')
  const Composition = Reflect.apply(Parent.makeComposition, undefined, [
    { childBindings: [InvalidPresenceBinding] },
  ])
  const invalidUpdate = Reflect.apply(
    Reflect.get(Composition, 'makeUpdate'),
    undefined,
    [
      (model: Model, { message }: typeof Message.Type) =>
        Reflect.apply(fold, InvalidPresenceBinding, [model, message]),
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
      Message.GotChildMessage({
        message: ChildMessage.UpdatedCount({ count: 1 }),
      }),
    ]),
  ).toThrow(/must return a boolean/)
})

it('rejects ignored keyed adapters on erased accessor configs', () => {
  const bind = (config: unknown) =>
    Reflect.apply(Parent.bindChild, Parent, [childBlock, config])
  for (const field of ['Model', 'key', 'writeAt']) {
    expect(() =>
      bind({
        fromParentMessage: false,
        read: (model: Model) => Option.some(model.child),
        write: (model: Model) => model,
        toParentMessage: (message: typeof ChildMessage.Type) =>
          Message.GotChildMessage({ message }),
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
  const Parent = define('DirectPresenceCallableParent', { Model, Message })
  const ChildBinding = Parent.bindChild(childBlock, {
    field: 'child',
    fromParentMessage: false,
    parentMessage: Message.GotChildMessage,
  })
  const OptionalBinding = Parent.bindChild(childBlock, {
    field: 'maybeChild',
    fromParentMessage: false,
    parentMessage: Message.GotChildMessage,
  })
  const Composition = Parent.makeComposition({
    childBindings: [ChildBinding, OptionalBinding],
  })
  const updateChild = Composition.makeUpdate((model, { message }) =>
    ChildBinding.fold(model, message),
  )
  const updateOptional = Composition.makeUpdate((model, { message }) =>
    OptionalBinding.fold(model, message),
  )
  const initial = Model({
    child: ChildModel.make({ count: 1 }),
    maybeChild: Option.none(),
  })
  expect(
    updateChild(
      initial,
      Message.GotChildMessage({
        message: ChildMessage.UpdatedCount({ count: 2 }),
      }),
    ).model,
  ).toEqual(
    Model({ child: ChildModel.make({ count: 2 }), maybeChild: Option.none() }),
  )
  expect(
    updateOptional(
      initial,
      Message.GotChildMessage({
        message: ChildMessage.UpdatedCount({ count: 2 }),
      }),
    ).model,
  ).toBe(initial)
})

it('rejects ignored Model overrides on parent-owned direct fields', () => {
  for (const field of ['Model', 'ChildModel']) {
    expect(() =>
      Reflect.apply(Parent.bindChild, Parent, [
        childBlock,
        {
          field: 'child',
          fromParentMessage: false,
          parentMessage: Message.GotChildMessage,
          [field]: Schema.String,
        },
      ]),
    ).toThrow(/parent-owned field Binding cannot supply/)
  }
})
