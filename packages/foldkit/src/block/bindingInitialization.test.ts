import { Array, Effect, Option, Schema, Tuple, pipe } from 'effect'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as Update from '../update/index.js'
import { makeDefinition } from './define.js'
import {
  assertRegisteredBinding,
  withOperationGraph,
} from './operationGraph.js'
import * as Block from './public.js'

const ChildModel = Schema.Struct({ count: Schema.Number })
const ChildMessage = defineMessageUnion({
  CompletedRead: { value: Schema.Number },
})
const Child = makeDefinition('InitializedChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
const Read = Child.makeCommand('Read', {
  args: { value: Schema.Number },
  messages: [ChildMessage.CompletedRead],
  handler: function* () {
    return ({ value }) => Effect.succeed(ChildMessage.CompletedRead({ value }))
  },
})
const initialized = vi.fn<(count: number) => void>()
const ChildComposition = Child.makeComposition()
const prepareChild = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit((count: number) => {
      initialized(count)

      return { model: { count }, commands: [Read({ value: count })] }
    }),
    update: ChildComposition.makeUpdate({
      CompletedRead: model => ({ model }),
    }),
    EffectsLayer: Read.layer,
  })
const child: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChild
> = Block.assemble(prepareChild)

const ParentModel = Schema.Struct({
  items: Schema.Array(Schema.Struct({ id: Schema.String, child: ChildModel })),
})
const ParentMessage = defineMessageUnion({
  CompletedRecord: {},
  RequestedCreateChild: {},
  RequestedCreateKeyedChild: { label: Schema.String },
  RequestedCreateIncompleteKeyedChild: {},
})
const Parent = makeDefinition('InitializationParent', {
  Model: ParentModel,
  Message: ParentMessage,
})
const Record = Parent.makeCommand('Record', {
  messages: [ParentMessage.CompletedRecord],
  handler: function* () {
    return () => Effect.succeed(ParentMessage.CompletedRecord())
  },
})
const ItemsBinding = Parent.makeBinding(child, {
  field: 'items',
  key: 'id',
  childField: 'child',
})
const ParentComposition = Parent.makeComposition({
  bindings: [ItemsBinding],
})
const init = ParentComposition.makeInit(() =>
  ItemsBinding.init({
    key: 'first',
    args: [4],
    toParentModel: child =>
      ParentModel.make({ items: [{ id: 'first', child }] }),
    commands: [Record()],
  }),
)
const prepareParent = () =>
  ParentComposition.prepareBlock({
    init,
    update: ParentComposition.makeUpdate({
      CompletedRecord: model => ({ model }),
      RequestedCreateChild: model => ({ model }),
      RequestedCreateKeyedChild: model => ({ model }),
      RequestedCreateIncompleteKeyedChild: model => ({ model }),
    }),
    EffectsLayer: Record.layer,
  })
const parent: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareParent
> = Block.assemble(prepareParent)

beforeEach(() => initialized.mockClear())

describe('connected initialization', () => {
  it('constructs a passive noncallable recipe without initializing the child', () => {
    const recipe = ItemsBinding.init({
      key: 'first',
      args: [4],
      toParentModel: child => ({ items: [{ id: 'first', child }] }),
    })

    expect(recipe).not.toBeTypeOf('function')
    expect(recipe).not.toHaveProperty('model')
    expect(recipe).not.toHaveProperty('commands')
    expect(() =>
      // @ts-expect-error A passive initialization recipe is not callable.
      Reflect.apply(recipe, undefined, []),
    ).toThrow(TypeError)
    expect(initialized).not.toHaveBeenCalled()
  })

  it('rejects interpretation in a foreign graph before calling the child', () => {
    const recipe = ItemsBinding.init({
      key: 'first',
      args: [4],
      toParentModel: child => ({ items: [{ id: 'first', child }] }),
    })
    const ForeignItemsBinding = Parent.makeBinding(child, {
      placement: 'foreign-items',
      field: 'items',
      key: 'id',
      childField: 'child',
    })
    const ForeignComposition = Parent.makeComposition({
      bindings: [ForeignItemsBinding],
    })
    const foreignInit = Reflect.apply(ForeignComposition.makeInit, undefined, [
      () => recipe,
    ])

    expect(foreignInit).toThrow('not registered in the current Block graph')
    expect(initialized).not.toHaveBeenCalled()
  })

  it('accepts Schema reconstruction and lifts child Commands before parent Commands', async () => {
    const parentInit = init()
    const messages = await Effect.runPromise(
      pipe(
        parentInit.commands ?? [],
        Array.map(command => command.effect),
        Effect.all,
        Effect.provide(parent.EffectsLayer),
      ),
    )

    expect(initialized).toHaveBeenCalledExactlyOnceWith(4)
    expect(parentInit.model).toEqual({
      items: [{ id: 'first', child: { count: 4 } }],
    })
    expect(messages).toEqual([
      {
        _tag: 'GotInitializedChildMessage',
        placement: 'InitializedChild',
        generation: 0,
        key: 'first',
        message: ChildMessage.CompletedRead({ value: 4 }),
      },
      ParentMessage.CompletedRecord(),
    ])
  })

  it.each([
    ['missing occurrence', (_child: typeof ChildModel.Type) => ({ items: [] })],
    [
      'wrong occurrence key',
      (child: typeof ChildModel.Type) => ({ items: [{ id: 'other', child }] }),
    ],
    [
      'duplicate occurrence key',
      (child: typeof ChildModel.Type) => ({
        items: [
          { id: 'first', child },
          { id: 'first', child },
        ],
      }),
    ],
    [
      'discarded child state',
      (_child: typeof ChildModel.Type) => ({
        items: [{ id: 'first', child: { count: 99 } }],
      }),
    ],
  ])('rejects a parent mapping with %s', (_name, toParentModel) => {
    expect(() =>
      ParentComposition.makeInit(() =>
        ItemsBinding.init({
          key: 'first',
          args: [4],
          toParentModel,
        }),
      )(),
    ).toThrow('must store exactly one occurrence at key "first"')
  })

  it('preserves other occurrences when inserting a child', () => {
    const existing = { id: 'other', child: ChildModel.make({ count: 8 }) }
    const initialModel = { items: [existing] }
    const createChild = Parent.makeStep(model =>
      ItemsBinding.init({
        key: 'first',
        args: [4],
        toParentModel: child =>
          modifyFields(model, { items: Array.append({ id: 'first', child }) }),
      }),
    )
    const prepareCompleted = () =>
      ParentComposition.prepareBlock({
        init: () => ({ model: initialModel }),
        update: ParentComposition.makeUpdate({
          RequestedCreateChild: model => createChild(model),
          CompletedRecord: model => Parent.makeNoopStep()(model),
          RequestedCreateKeyedChild: model => Parent.makeNoopStep()(model),
          RequestedCreateIncompleteKeyedChild: model =>
            Parent.makeNoopStep()(model),
        }),
        operations: {
          createChild: () => Tuple.make(ParentMessage.RequestedCreateChild()),
        },
      })
    const completed: Block.FromAssemblyWithoutViewOrOutMessage<
      typeof ParentModel,
      typeof prepareCompleted
    > = Block.assemble(prepareCompleted)
    const created = completed.operations.createChild(initialModel)

    expect(Option.getOrThrow(Array.head(created.model.items))).toBe(existing)
    expect(created.model.items).toEqual([
      existing,
      { id: 'first', child: { count: 4 } },
    ])
  })

  it('threads a derived Model through registered keyed initialization Steps', () => {
    const initializeFirst = Parent.makeStep(model =>
      ItemsBinding.init({
        key: 'first',
        args: [1],
        toParentModel: child =>
          modifyFields(model, {
            items: Array.append({ id: 'first', child }),
          }),
      }),
    )
    const initializeSecond = Parent.makeStep(model =>
      ItemsBinding.init({
        key: 'second',
        args: [2],
        toParentModel: child =>
          modifyFields(model, {
            items: Array.append({ id: 'second', child }),
          }),
      }),
    )
    const prepareCompleted = () =>
      ParentComposition.prepareBlock({
        init: () => ({ model: ParentModel.make({ items: [] }) }),
        update: ParentComposition.makeUpdate({
          RequestedCreateChild: model => {
            const nextModel = modifyFields(model, {
              items: Array.append({
                id: 'existing',
                child: ChildModel.make({ count: 8 }),
              }),
            })
            return Update.combineSteps(nextModel, [
              initializeFirst,
              initializeSecond,
            ])
          },
          CompletedRecord: model => Parent.makeNoopStep()(model),
          RequestedCreateKeyedChild: model => Parent.makeNoopStep()(model),
          RequestedCreateIncompleteKeyedChild: model =>
            Parent.makeNoopStep()(model),
        }),
        operations: {
          createChildren: () =>
            Tuple.make(ParentMessage.RequestedCreateChild()),
        },
      })
    const completed: Block.FromAssemblyWithoutViewOrOutMessage<
      typeof ParentModel,
      typeof prepareCompleted
    > = Block.assemble(prepareCompleted)
    const created = completed.operations.createChildren(
      ParentModel.make({ items: [] }),
    )

    expect(created.model.items).toEqual([
      { id: 'existing', child: { count: 8 } },
      { id: 'first', child: { count: 1 } },
      { id: 'second', child: { count: 2 } },
    ])
    expect(created.commands).toHaveLength(2)
  })

  it.each([undefined, NaN, Infinity, {}, false])(
    'rejects an invalid erased key %s before child initialization',
    key => {
      expect(() =>
        withOperationGraph([ItemsBinding], () =>
          Reflect.apply(ItemsBinding.init, undefined, [
            {
              key,
              args: [4],
              toParentModel: (child: typeof ChildModel.Type) => ({
                items: [{ id: 'first', child }],
              }),
            },
          ]),
        ),
      ).toThrow('key')
      expect(initialized).not.toHaveBeenCalled()
    },
  )

  it.each([
    undefined,
    {},
    { key: 'first', args: 4, toParentModel: () => ({ items: [] }) },
    { key: 'first', args: [4] },
    {
      key: 'first',
      args: [4],
      toParentModel: () => ({ items: [] }),
      commands: {},
    },
  ])(
    'rejects a malformed erased configuration %s before child initialization',
    config => {
      expect(() =>
        withOperationGraph([ItemsBinding], () =>
          Reflect.apply(ItemsBinding.init, undefined, [config]),
        ),
      ).toThrow('init')
      expect(initialized).not.toHaveBeenCalled()
    },
  )

  it('retains a caller projection error and restores the previous graph', () => {
    const failure = new Error('cannot construct parent')
    const failing = ParentComposition.makeInit(() =>
      ItemsBinding.init({
        key: 'first',
        args: [4],
        toParentModel: (): typeof ParentModel.Type => {
          throw failure
        },
      }),
    )

    withOperationGraph([ItemsBinding], () => {
      expect(failing).toThrow(failure)
      expect(() => assertRegisteredBinding(ItemsBinding, 'items')).not.toThrow()
    })
    expect(() => assertRegisteredBinding(ItemsBinding, 'items')).toThrow(
      'not registered in the current Block graph',
    )
  })

  it('keeps ordinary Model construction available without a registered graph', () => {
    expect(
      ParentModel.make({
        items: [{ id: 'first', child: ChildModel.make({ count: 2 }) }],
      }),
    ).toEqual({ items: [{ id: 'first', child: { count: 2 } }] })
    expect(initialized).not.toHaveBeenCalled()
  })
})

const DirectModel = Schema.Struct({
  child: Schema.Option(ChildModel),
  label: Schema.String,
})
const DirectMessage = defineMessageUnion({
  RequestedCreateChild: { label: Schema.String },
  RequestedCreateIncompleteChild: {},
})
const Direct = makeDefinition('DirectInitializationParent', {
  Model: DirectModel,
  Message: DirectMessage,
})
const DirectBinding = Direct.makeBinding(child, {
  field: 'child',
})
const DirectComposition = Direct.makeComposition({
  bindings: [DirectBinding],
})
const createDirectChild = Direct.makeStep((_model, label: string) =>
  DirectBinding.init({
    args: [5],
    toParentModel: child => ({ child: Option.some(child), label }),
  }),
)
const createIncompleteDirectChild = Direct.makeStep(
  (_model): ReturnType<typeof createDirectChild> =>
    Reflect.apply(DirectBinding.init, undefined, [
      {
        args: [5],
        toParentModel: (child: typeof ChildModel.Type) => ({
          child: Option.some(child),
        }),
      },
    ]),
)
const prepareDynamicDirect = () =>
  DirectComposition.prepareBlock({
    init: DirectComposition.makeInit(() => ({
      model: DirectModel.make({ child: Option.none(), label: 'initial' }),
    })),
    update: DirectComposition.makeUpdate({
      RequestedCreateChild: (model, { label }) =>
        createDirectChild(model, label),
      RequestedCreateIncompleteChild: model =>
        createIncompleteDirectChild(model),
    }),
    operations: {
      createDirectChild: (label: string) =>
        Tuple.make(DirectMessage.RequestedCreateChild({ label })),
      createIncompleteDirectChild: () =>
        Tuple.make(DirectMessage.RequestedCreateIncompleteChild()),
    },
  })
const dynamicDirect: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof DirectModel,
  typeof prepareDynamicDirect
> = Block.assemble(prepareDynamicDirect)

describe('direct connected initialization', () => {
  it('constructs an optional child and retains its lifted Commands', async () => {
    const directInit = DirectComposition.makeInit(() =>
      DirectBinding.init({
        args: [5],
        toParentModel: child =>
          DirectModel.make({ child: Option.some(child), label: 'parent' }),
      }),
    )
    const prepareDirect = () =>
      DirectComposition.prepareBlock({
        init: directInit,
        update: dynamicDirect.update,
        operations: {},
      })
    const direct: Block.FromAssemblyWithoutViewOrOutMessage<
      typeof DirectModel,
      typeof prepareDirect
    > = Block.assemble(prepareDirect)
    const initialized = directInit()
    const command = Option.getOrThrow(Array.head(initialized.commands ?? []))
    const message = await Effect.runPromise(
      command.effect.pipe(Effect.provide(direct.EffectsLayer)),
    )

    expect(initialized.model).toEqual({
      child: Option.some({ count: 5 }),
      label: 'parent',
    })
    expect(message).toEqual({
      _tag: 'GotChildMessage',
      placement: 'child',
      generation: 0,
      message: ChildMessage.CompletedRead({ value: 5 }),
    })
  })

  it('rejects retaining absence instead of the initialized child', () => {
    const discardChild = DirectComposition.makeInit(() =>
      DirectBinding.init({
        args: [5],
        toParentModel: () =>
          DirectModel.make({ child: Option.none(), label: 'parent' }),
      }),
    )

    expect(discardChild).toThrow('must preserve the initialized child Model')
  })

  it('defers an unkeyed child initializer until its recipe is interpreted', () => {
    const recipe = DirectBinding.init({
      args: [5],
      toParentModel: child => ({
        child: Option.some(child),
        label: 'parent',
      }),
    })

    expect(recipe).not.toHaveProperty('model')
    expect(initialized).not.toHaveBeenCalled()

    const init = DirectComposition.makeInit(() => recipe)

    expect(init().model).toEqual({
      child: Option.some({ count: 5 }),
      label: 'parent',
    })
    expect(initialized).toHaveBeenCalledExactlyOnceWith(5)
  })

  it('accepts a complete parent Model from a completed exposed operation', () => {
    const directInit = dynamicDirect.init()
    const created = dynamicDirect.operations.createDirectChild(
      directInit.model,
      'complete',
    )

    expect(created.model).toEqual({
      child: Option.some({ count: 5 }),
      label: 'complete',
    })
  })

  it('rejects an erased partial parent Model from a completed exposed operation', () => {
    const directInit = dynamicDirect.init()

    expect(() =>
      dynamicDirect.operations.createIncompleteDirectChild(directInit.model),
    ).toThrow('must return a complete parent Model')
  })
})

const SequencedParentModel = Schema.Struct({
  route: Schema.Literals(['Home', 'Play']),
  first: Schema.Option(ChildModel),
  second: Schema.Option(ChildModel),
  didSecondSeeFirst: Schema.Boolean,
})
const SequencedParentMessage = defineMessageUnion({
  RequestedOpen: {},
  CompletedRecord: {},
})
const SequencedParent = makeDefinition('SequencedInitializationParent', {
  Model: SequencedParentModel,
  Message: SequencedParentMessage,
})
const RecordSequencedInitialization = SequencedParent.makeCommand(
  'RecordSequencedInitialization',
  {
    messages: [SequencedParentMessage.CompletedRecord],
    handler: function* () {
      return () => Effect.succeed(SequencedParentMessage.CompletedRecord())
    },
  },
)
const FirstSequencedBinding = SequencedParent.makeBinding(child, {
  placement: 'first',
  field: 'first',
})
const SecondSequencedBinding = SequencedParent.makeBinding(child, {
  placement: 'second',
  field: 'second',
})
const initializeFirstSequencedChild = SequencedParent.makeStep(model =>
  FirstSequencedBinding.init({
    args: [1],
    toParentModel: child =>
      modifyFields(model, { first: () => Option.some(child) }),
    commands: [RecordSequencedInitialization()],
  }),
)
const initializeSecondSequencedChild = SequencedParent.makeStep(model =>
  SecondSequencedBinding.init({
    args: [2],
    toParentModel: child =>
      modifyFields(model, {
        second: () => Option.some(child),
        didSecondSeeFirst: () => Option.isSome(model.first),
      }),
  }),
)
const SequencedParentComposition = SequencedParent.makeComposition({
  bindings: [FirstSequencedBinding, SecondSequencedBinding],
})
const sequencedInitialModel = SequencedParentModel.make({
  route: 'Home',
  first: Option.none(),
  second: Option.none(),
  didSecondSeeFirst: false,
})
const prepareSequencedParent = () =>
  SequencedParentComposition.prepareBlock({
    init: SequencedParentComposition.makeInit(() => ({
      model: sequencedInitialModel,
    })),
    update: SequencedParentComposition.makeUpdate({
      RequestedOpen: model => {
        const nextModel = modifyFields(model, { route: () => 'Play' })
        return Update.combineSteps(nextModel, [
          initializeFirstSequencedChild,
          initializeSecondSequencedChild,
        ])
      },
      CompletedRecord: model => SequencedParent.makeNoopStep()(model),
    }),
    operations: {
      open: () => Tuple.make(SequencedParentMessage.RequestedOpen()),
    },
    EffectsLayer: RecordSequencedInitialization.layer,
  })
const sequencedParent: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof SequencedParentModel,
  typeof prepareSequencedParent
> = Block.assemble(prepareSequencedParent)

it('threads a derived Model through registered connected initialization Steps', async () => {
  const opened = sequencedParent.operations.open(sequencedInitialModel)
  const messages = await Effect.runPromise(
    pipe(
      opened.commands ?? [],
      Array.map(command => command.effect),
      Effect.all,
      Effect.provide(sequencedParent.EffectsLayer),
    ),
  )

  expect(opened.model).toEqual({
    route: 'Play',
    first: Option.some({ count: 1 }),
    second: Option.some({ count: 2 }),
    didSecondSeeFirst: true,
  })
  expect(messages).toEqual([
    {
      _tag: 'GotFirstMessage',
      generation: 0,
      message: ChildMessage.CompletedRead({ value: 1 }),
      placement: 'first',
    },
    SequencedParentMessage.CompletedRecord(),
    {
      _tag: 'GotSecondMessage',
      generation: 0,
      message: ChildMessage.CompletedRead({ value: 2 }),
      placement: 'second',
    },
  ])
})

const CompleteKeyedModel = Schema.Struct({
  items: Schema.Array(Schema.Struct({ id: Schema.String, child: ChildModel })),
  label: Schema.String,
})
const CompleteKeyed = makeDefinition('CompleteKeyedInitializationParent', {
  Model: CompleteKeyedModel,
  Message: ParentMessage,
})
const CompleteItemsBinding = CompleteKeyed.makeBinding(child, {
  field: 'items',
  key: 'id',
  childField: 'child',
})
const CompleteKeyedComposition = CompleteKeyed.makeComposition({
  bindings: [CompleteItemsBinding],
})
const createKeyedChild = CompleteKeyed.makeStep((_model, label: string) =>
  CompleteItemsBinding.init({
    key: 'first',
    args: [6],
    toParentModel: child => ({
      items: [{ id: 'first', child }],
      label,
    }),
  }),
)
const createIncompleteKeyedChild = CompleteKeyed.makeStep(
  (_model): ReturnType<typeof createKeyedChild> =>
    Reflect.apply(CompleteItemsBinding.init, undefined, [
      {
        key: 'first',
        args: [6],
        toParentModel: (child: typeof ChildModel.Type) => ({
          items: [{ id: 'first', child }],
        }),
      },
    ]),
)
const prepareDynamicKeyed = () =>
  CompleteKeyedComposition.prepareBlock({
    init: CompleteKeyedComposition.makeInit(() => ({
      model: CompleteKeyedModel.make({ items: [], label: 'initial' }),
    })),
    update: CompleteKeyedComposition.makeUpdate({
      RequestedCreateKeyedChild: (model, { label }) =>
        createKeyedChild(model, label),
      RequestedCreateIncompleteKeyedChild: model =>
        createIncompleteKeyedChild(model),
      CompletedRecord: model => CompleteKeyed.makeNoopStep()(model),
      RequestedCreateChild: model => CompleteKeyed.makeNoopStep()(model),
    }),
    operations: {
      createKeyedChild: (label: string) =>
        Tuple.make(ParentMessage.RequestedCreateKeyedChild({ label })),
      createIncompleteKeyedChild: () =>
        Tuple.make(ParentMessage.RequestedCreateIncompleteKeyedChild()),
    },
  })
const dynamicKeyed: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof CompleteKeyedModel,
  typeof prepareDynamicKeyed
> = Block.assemble(prepareDynamicKeyed)

describe('keyed complete parent validation', () => {
  it('accepts a complete parent Model from a completed exposed operation', () => {
    const keyedInit = dynamicKeyed.init()
    const created = dynamicKeyed.operations.createKeyedChild(
      keyedInit.model,
      'complete',
    )

    expect(created.model).toEqual({
      items: [{ id: 'first', child: { count: 6 } }],
      label: 'complete',
    })
  })

  it('rejects an erased partial parent Model from a completed exposed operation', () => {
    const keyedInit = dynamicKeyed.init()

    expect(() =>
      dynamicKeyed.operations.createIncompleteKeyedChild(keyedInit.model),
    ).toThrow('must return a complete parent Model')
  })
})
