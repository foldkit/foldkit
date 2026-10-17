import { Array, Effect, Option, Schema, pipe } from 'effect'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import { define } from './define.js'
import {
  assertRegisteredBinding,
  withOperationGraph,
} from './operationGraph.js'

const ChildModel = Schema.Struct({ count: Schema.Number })
const ChildMessage = defineMessageUnion({
  CompletedRead: { value: Schema.Number },
})
const Child = define('InitializedChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
const Read = Child.command('Read', {
  args: { value: Schema.Number },
  messages: [ChildMessage.CompletedRead],
  handler: function* () {
    return ({ value }) => Effect.succeed(ChildMessage.CompletedRead({ value }))
  },
})
const initialized = vi.fn<(count: number) => void>()
const ChildComposition = Child.makeComposition()
const child = ChildComposition.makeBlock({
  init: ChildComposition.makeInit((count: number) => {
    initialized(count)

    return { model: { count }, commands: [Read({ value: count })] }
  }),
  update: ChildComposition.makeUpdate(model => ({ model })),
  EffectsLayer: Read.layer,
})

const ParentModel = Schema.Struct({
  items: Schema.Array(Schema.Struct({ id: Schema.String, child: ChildModel })),
})
const ParentMessage = defineMessageUnion({
  GotChildMessage: { id: Schema.String, message: ChildMessage },
  CompletedRecord: {},
})
const Parent = define('InitializationParent', {
  Model: ParentModel,
  Message: ParentMessage,
})
const Record = Parent.command('Record', {
  messages: [ParentMessage.CompletedRecord],
  handler: function* () {
    return () => Effect.succeed(ParentMessage.CompletedRecord())
  },
})
const ItemsBinding = Parent.bindChild(child, {
  field: 'items',
  key: 'id',
  childField: 'child',
  toParentMessage: (id, message) =>
    ParentMessage.GotChildMessage({ id, message }),
  fromParentMessage: {
    parentMessage: ParentMessage.GotChildMessage,
    args: (_model, { id, message }) => Option.some([id, message]),
  },
})
const ParentComposition = Parent.makeComposition({
  childBindings: [ItemsBinding],
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
const parent = ParentComposition.makeBlock({
  init,
  update: ParentComposition.makeUpdate(model => ({ model })),
  EffectsLayer: Record.layer,
})

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
    const ForeignComposition = Parent.makeComposition()
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
      ParentMessage.GotChildMessage({
        id: 'first',
        message: ChildMessage.CompletedRead({ value: 4 }),
      }),
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
    const createChild = Parent.step(model =>
      ItemsBinding.init({
        key: 'first',
        args: [4],
        toParentModel: child =>
          modifyFields(model, { items: Array.append({ id: 'first', child }) }),
      }),
    )
    const completed = ParentComposition.makeBlock({
      init: () => ({ model: initialModel }),
      update: ParentComposition.makeUpdate(model => ({ model })),
      expose: { createChild },
    })
    const created = completed.expose.createChild(initialModel)

    expect(Option.getOrThrow(Array.head(created.model.items))).toBe(existing)
    expect(created.model.items).toEqual([
      existing,
      { id: 'first', child: { count: 4 } },
    ])
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
  GotChildMessage: { message: ChildMessage },
})
const Direct = define('DirectInitializationParent', {
  Model: DirectModel,
  Message: DirectMessage,
})
const DirectBinding = Direct.bindChild(child, {
  field: 'child',
  parentMessage: DirectMessage.GotChildMessage,
})
const DirectComposition = Direct.makeComposition({
  childBindings: [DirectBinding],
})
const createDirectChild = Direct.step((_model, label: string) =>
  DirectBinding.init({
    args: [5],
    toParentModel: child => ({ child: Option.some(child), label }),
  }),
)
const createIncompleteDirectChild = Direct.step(
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
const dynamicDirect = DirectComposition.makeBlock({
  init: DirectComposition.makeInit(() => ({
    model: DirectModel.make({ child: Option.none(), label: 'initial' }),
  })),
  update: DirectComposition.makeUpdate(),
  expose: { createDirectChild, createIncompleteDirectChild },
})

describe('direct connected initialization', () => {
  it('constructs an optional child and retains its lifted Commands', async () => {
    const directInit = DirectComposition.makeInit(() =>
      DirectBinding.init({
        args: [5],
        toParentModel: child =>
          DirectModel.make({ child: Option.some(child), label: 'parent' }),
      }),
    )
    const direct = DirectComposition.makeBlock({
      init: directInit,
      update: DirectComposition.makeUpdate(),
    })
    const initialized = directInit()
    const command = Option.getOrThrow(Array.head(initialized.commands ?? []))
    const message = await Effect.runPromise(
      command.effect.pipe(Effect.provide(direct.EffectsLayer)),
    )

    expect(initialized.model).toEqual({
      child: Option.some({ count: 5 }),
      label: 'parent',
    })
    expect(message).toEqual(
      DirectMessage.GotChildMessage({
        message: ChildMessage.CompletedRead({ value: 5 }),
      }),
    )
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
    const created = dynamicDirect.expose.createDirectChild(
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
      dynamicDirect.expose.createIncompleteDirectChild(directInit.model),
    ).toThrow('must return a complete parent Model')
  })
})

const CompleteKeyedModel = Schema.Struct({
  items: Schema.Array(Schema.Struct({ id: Schema.String, child: ChildModel })),
  label: Schema.String,
})
const CompleteKeyed = define('CompleteKeyedInitializationParent', {
  Model: CompleteKeyedModel,
  Message: ParentMessage,
})
const CompleteItemsBinding = CompleteKeyed.bindChild(child, {
  field: 'items',
  key: 'id',
  childField: 'child',
  toParentMessage: (id, message) =>
    ParentMessage.GotChildMessage({ id, message }),
  fromParentMessage: {
    parentMessage: ParentMessage.GotChildMessage,
    args: (_model, { id, message }) => Option.some([id, message]),
  },
})
const CompleteKeyedComposition = CompleteKeyed.makeComposition({
  childBindings: [CompleteItemsBinding],
})
const createKeyedChild = CompleteKeyed.step((_model, label: string) =>
  CompleteItemsBinding.init({
    key: 'first',
    args: [6],
    toParentModel: child => ({
      items: [{ id: 'first', child }],
      label,
    }),
  }),
)
const createIncompleteKeyedChild = CompleteKeyed.step(
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
const dynamicKeyed = CompleteKeyedComposition.makeBlock({
  init: CompleteKeyedComposition.makeInit(() => ({
    model: CompleteKeyedModel.make({ items: [], label: 'initial' }),
  })),
  update: CompleteKeyedComposition.makeUpdate(model => ({ model })),
  expose: { createKeyedChild, createIncompleteKeyedChild },
})

describe('keyed complete parent validation', () => {
  it('accepts a complete parent Model from a completed exposed operation', () => {
    const keyedInit = dynamicKeyed.init()
    const created = dynamicKeyed.expose.createKeyedChild(
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
      dynamicKeyed.expose.createIncompleteKeyedChild(keyedInit.model),
    ).toThrow('must return a complete parent Model')
  })
})
