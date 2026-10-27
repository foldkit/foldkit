import {
  Array,
  Effect,
  HashMap,
  Option,
  Predicate,
  Schema,
  Tuple,
} from 'effect'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as Update from '../update/index.js'
import { resolveOperationOutput } from '../update/operationRecipe.js'
import { runBindingInitRecipe } from './initRecipe.js'
import { commandInstances } from './instanceContext.js'
import { initAndInsert, makeInitIfMissingStep } from './mapInitialization.js'
import { withOperationGraph } from './operationGraph.js'
import * as Block from './public.js'

const ChildModel = Schema.Struct({ count: Schema.Number })
const ChildMessage = defineMessageUnion({
  CompletedRead: { count: Schema.Number },
})
const ChildOutMessage = defineMessageUnion({
  ChangedCount: { count: Schema.Number },
})
const ChildDefinition = Block.makeDefinition('InsertChild', {
  Model: ChildModel,
  Message: ChildMessage,
  OutMessage: ChildOutMessage,
})
const Read = ChildDefinition.makeCommand('Read', {
  args: { count: Schema.Number },
  messages: [ChildMessage.CompletedRead],
  handler: function* () {
    return ({ count }) => Effect.succeed(ChildMessage.CompletedRead({ count }))
  },
})
const initialized = vi.fn<(count: number) => void>()
const ChildComposition = ChildDefinition.makeComposition()
const prepareChild = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit((count: number) => {
      initialized(count)
      return { model: { count }, commands: [Read({ count })] }
    }),
    update: ChildComposition.makeUpdate({
      CompletedRead: model => ({ model }),
    }),
    EffectsLayer: Read.layer,
  })
const ChildBlock: Block.FromAssemblyWithOutMessage<
  typeof ChildModel,
  typeof prepareChild
> = Block.assemble(prepareChild)

const EntryId = Schema.String.check(Schema.isMinLength(2)).pipe(
  Schema.brand('InsertEntryId'),
)
const Wrapper = Schema.Struct({ child: ChildModel, label: Schema.String })
const Model = Schema.Struct({
  childrenById: Schema.Record(EntryId, ChildModel),
  childrenByNumber: Schema.HashMap(Schema.Int, ChildModel),
  rowsById: Schema.Record(EntryId, Wrapper),
  label: Schema.String,
})
const Message = defineMessageUnion({
  RequestedRecordInsert: { key: EntryId, count: Schema.Number },
  RequestedHashMapInsert: { key: Schema.Int, count: Schema.Number },
  RequestedRecordInit: { key: EntryId, count: Schema.Number },
  RequestedHashMapInit: { key: Schema.Int, count: Schema.Number },
  RequestedInitTwice: { key: EntryId, count: Schema.Number },
})
const ParentDefinition = Block.makeDefinition('InsertParent', {
  Model,
  Message,
})
const ChildrenByIdBinding = ParentDefinition.makeMapBinding(ChildBlock, {
  field: 'childrenById',
})
const ChildrenByNumberBinding = ParentDefinition.makeMapBinding(ChildBlock, {
  field: 'childrenByNumber',
})
const RowsByIdBinding = ParentDefinition.makeMapBinding(ChildBlock, {
  field: 'rowsById',
  childField: 'child',
})
const ChildrenByIdBindingWithPolicy = ChildrenByIdBinding.withOutMessagePolicy({
  fold: () => ParentDefinition.makeNoopStep(),
})
const Composition = ParentDefinition.makeComposition({
  bindings: [
    ChildrenByIdBindingWithPolicy,
    ChildrenByNumberBinding.withOutMessagePolicy({
      fold: () => ParentDefinition.makeNoopStep(),
    }),
    RowsByIdBinding.withOutMessagePolicy({
      fold: () => ParentDefinition.makeNoopStep(),
    }),
  ],
})
const prepareParent = () =>
  Composition.prepareBlock({
    init: Composition.makeInit(() => ({
      model: {
        childrenById: {},
        childrenByNumber: HashMap.empty(),
        rowsById: {},
        label: 'current',
      },
    })),
    update: Composition.makeUpdate({
      RequestedRecordInsert: (model, { key, count }) =>
        initAndInsert(ChildrenByIdBinding, model, { key, args: [count] }),
      RequestedHashMapInsert: (model, { key, count }) =>
        initAndInsert(ChildrenByNumberBinding, model, { key, args: [count] }),
      RequestedRecordInit: (model, { key, count }) =>
        makeInitIfMissingStep(ChildrenByIdBindingWithPolicy, {
          key,
          args: [count],
        })(model),
      RequestedHashMapInit: (model, { key, count }) =>
        makeInitIfMissingStep(ChildrenByNumberBinding, { key, args: [count] })(
          model,
        ),
      RequestedInitTwice: (model, { key, count }) =>
        Update.combineSteps(model, [
          makeInitIfMissingStep(ChildrenByIdBinding, { key, args: [count] }),
          makeInitIfMissingStep(ChildrenByIdBinding, {
            key,
            args: [count + 1],
          }),
        ]),
    }),
    operations: {
      insertRecord: (key: typeof EntryId.Type, count: number) =>
        Tuple.make(Message.RequestedRecordInsert({ key, count })),
      insertHashMap: (key: number, count: number) =>
        Tuple.make(Message.RequestedHashMapInsert({ key, count })),
      initRecord: Message.RequestedRecordInit,
      initHashMap: Message.RequestedHashMapInit,
      initTwice: Message.RequestedInitTwice,
    },
  })
const ParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepareParent
> = Block.assemble(prepareParent)

const firstId = EntryId.make('first')
const secondId = EntryId.make('second')
const makeModel = () => {
  const model = Model.make({
    childrenById: { [firstId]: ChildModel.make({ count: 1 }) },
    childrenByNumber: HashMap.make([1, ChildModel.make({ count: 2 })]),
    rowsById: {},
    label: 'retained',
  })

  return { model }
}

beforeEach(() => {
  initialized.mockClear()
})

describe('makeInitIfMissingStep', () => {
  it('defers initialization and captures the key and argument tuple at construction', () => {
    const { model } = makeModel()
    const args: [number] = [4]
    const config = { key: secondId, args }
    const initChildStep = makeInitIfMissingStep(ChildrenByIdBinding, config)

    args.splice(0, 1, 99)
    config.key = EntryId.make('changed')

    const recipe = Reflect.apply(initChildStep, undefined, [model])

    expect(initialized).not.toHaveBeenCalled()
    expect(recipe).not.toHaveProperty('model')
    expect(recipe).not.toHaveProperty('commands')

    const inserted = withOperationGraph([ChildrenByIdBinding], () =>
      resolveOperationOutput(recipe, model),
    )

    expect(initialized).toHaveBeenCalledExactlyOnceWith(4)
    expect(Reflect.get(inserted.model.childrenById, secondId)).toEqual({
      count: 4,
    })
    expect(Object.hasOwn(inserted.model.childrenById, 'changed')).toBe(false)
  })

  it('inserts a missing Record child and retains its qualified init Commands', async () => {
    const { model } = makeModel()
    const inserted = ParentBlock.operations.initRecord(model, {
      key: secondId,
      count: 4,
    })
    const command = Option.getOrThrow(Array.head(inserted.commands ?? []))
    const message = await Effect.runPromise(
      Effect.provide(command.effect, ParentBlock.EffectsLayer),
    )

    expect(Reflect.get(inserted.model.childrenById, firstId)).toBe(
      Reflect.get(model.childrenById, firstId),
    )
    expect(Reflect.get(inserted.model.childrenById, secondId)).toEqual({
      count: 4,
    })
    expect(inserted.model.childrenByNumber).toBe(model.childrenByNumber)
    expect(commandInstances(command)).toEqual([
      { binding: ChildrenByIdBinding, key: secondId, isInitialization: true },
    ])
    expect(message).toEqual({
      _tag: 'GotChildrenByIdMessage',
      placement: 'childrenById',
      key: secondId,
      generation: 0,
      message: ChildMessage.CompletedRead({ count: 4 }),
    })
  })

  it('preserves the exact parent Model and emits no Commands for an existing Record key', () => {
    const { model } = makeModel()
    const retained = ParentBlock.operations.initRecord(model, {
      key: firstId,
      count: 99,
    })

    expect(retained.model).toBe(model)
    expect(retained.commands ?? []).toEqual([])
    expect(initialized).not.toHaveBeenCalled()
  })

  it('inserts a missing HashMap child and preserves an existing key without resetting it', () => {
    const { model } = makeModel()
    const inserted = ParentBlock.operations.initHashMap(model, {
      key: 2,
      count: 4,
    })
    const retained = ParentBlock.operations.initHashMap(inserted.model, {
      key: 2,
      count: 99,
    })

    expect(
      Option.getOrThrow(HashMap.get(inserted.model.childrenByNumber, 2)),
    ).toEqual({ count: 4 })
    expect(inserted.model.childrenById).toBe(model.childrenById)
    expect(inserted.commands?.map(command => command.name)).toEqual([
      'childrenByNumber[2]/Read',
    ])
    expect(retained.model).toBe(inserted.model)
    expect(retained.commands ?? []).toEqual([])
    expect(initialized).toHaveBeenCalledExactlyOnceWith(4)
  })

  it('checks the Model produced by preceding Steps and initializes a repeated key only once', () => {
    const { model } = makeModel()
    const inserted = ParentBlock.operations.initTwice(model, {
      key: secondId,
      count: 4,
    })

    expect(Reflect.get(inserted.model.childrenById, secondId)).toEqual({
      count: 4,
    })
    expect(inserted.commands).toHaveLength(1)
    expect(initialized).toHaveBeenCalledExactlyOnceWith(4)
  })

  it.each([firstId, secondId])(
    'requires the registered Binding even when key %s already exists',
    key => {
      const { model } = makeModel()
      const initChildStep = makeInitIfMissingStep(ChildrenByIdBinding, {
        key,
        args: [4],
      })
      const recipe = Reflect.apply(initChildStep, undefined, [model])

      expect(() =>
        withOperationGraph([], () => resolveOperationOutput(recipe, model)),
      ).toThrow('not registered in the current Block graph')
      expect(initialized).not.toHaveBeenCalled()
    },
  )

  it('rechecks storage when the same Step is applied after the parent removes a key', () => {
    const { model } = makeModel()
    const initChildStep = makeInitIfMissingStep(ChildrenByIdBinding, {
      key: firstId,
      args: [4],
    })
    const applyStep = (model: typeof Model.Type) =>
      withOperationGraph([ChildrenByIdBinding], () =>
        resolveOperationOutput(
          Reflect.apply(initChildStep, undefined, [model]),
          model,
        ),
      )

    const retained = applyStep(model)

    expect(retained.model).toBe(model)
    expect(initialized).not.toHaveBeenCalled()

    const removedModel = modifyFields(model, {
      childrenById: () => ({}),
    })
    const inserted = applyStep(removedModel)

    expect(Reflect.get(inserted.model.childrenById, firstId)).toEqual({
      count: 4,
    })
    expect(initialized).toHaveBeenCalledExactlyOnceWith(4)
  })

  it('rejects wrapped values and malformed configuration before child init', () => {
    expect(() =>
      Reflect.apply(makeInitIfMissingStep, undefined, [
        RowsByIdBinding,
        { key: firstId, args: [4] },
      ]),
    ).toThrow('exact Record or HashMap child Binding')
    expect(() =>
      Reflect.apply(makeInitIfMissingStep, undefined, [
        ChildrenByIdBinding,
        { key: firstId, args: [4], commands: Array.empty() },
      ]),
    ).toThrow('does not support the configuration field "commands"')
    expect(initialized).not.toHaveBeenCalled()
  })
})

describe('initAndInsert', () => {
  it('constructs a passive recipe and snapshots the key and init arguments', () => {
    const { model } = makeModel()
    const args: [number] = [4]
    const config = { key: secondId, args }
    const recipe = initAndInsert(ChildrenByIdBinding, model, config)

    args.splice(0, 1, 99)
    config.key = EntryId.make('changed')

    expect(recipe).not.toBeTypeOf('function')
    expect(recipe).not.toHaveProperty('model')
    expect(recipe).not.toHaveProperty('commands')
    expect(initialized).not.toHaveBeenCalled()

    const inserted = withOperationGraph([ChildrenByIdBinding], () =>
      runBindingInitRecipe(recipe),
    )
    expect(initialized).toHaveBeenCalledExactlyOnceWith(4)
    if (!Predicate.isObject(inserted)) {
      throw new Error('Expected an update result')
    }
    const insertedModel = Reflect.get(inserted, 'model')
    if (!Predicate.isObject(insertedModel)) {
      throw new Error('Expected an inserted parent Model')
    }
    const childrenById = Reflect.get(insertedModel, 'childrenById')
    if (!Predicate.isObject(childrenById)) {
      throw new Error('Expected Record storage')
    }
    expect(Reflect.get(childrenById, secondId)).toEqual({ count: 4 })
    expect(Object.hasOwn(childrenById, 'changed')).toBe(false)
  })

  it('inserts a branded Record key while preserving existing entries, sibling fields, and child Commands', async () => {
    const { model } = makeModel()
    const first = Reflect.get(model.childrenById, firstId)
    const inserted = ParentBlock.operations.insertRecord(model, secondId, 4)
    const command = Option.getOrThrow(Array.head(inserted.commands ?? []))
    const message = await Effect.runPromise(
      Effect.provide(command.effect, ParentBlock.EffectsLayer),
    )

    expect(Reflect.get(inserted.model.childrenById, firstId)).toBe(first)
    expect(Reflect.get(inserted.model.childrenById, secondId)).toEqual({
      count: 4,
    })
    expect(inserted.model.childrenByNumber).toBe(model.childrenByNumber)
    expect(inserted.model.rowsById).toBe(model.rowsById)
    expect(inserted.model.label).toBe(model.label)
    expect(command.name).toBe('childrenById["second"]/Read')
    expect(commandInstances(command)).toEqual([
      {
        binding: ChildrenByIdBinding,
        key: secondId,
        isInitialization: true,
      },
    ])
    expect(message).toEqual({
      _tag: 'GotChildrenByIdMessage',
      placement: 'childrenById',
      generation: 0,
      key: secondId,
      message: ChildMessage.CompletedRead({ count: 4 }),
    })
  })

  it('inserts a numeric HashMap key while preserving existing values and sibling fields', () => {
    const { model } = makeModel()
    const second = Option.getOrThrow(HashMap.get(model.childrenByNumber, 1))
    const inserted = ParentBlock.operations.insertHashMap(model, 2, 5)

    expect(
      Option.getOrThrow(HashMap.get(inserted.model.childrenByNumber, 1)),
    ).toBe(second)
    expect(
      Option.getOrThrow(HashMap.get(inserted.model.childrenByNumber, 2)),
    ).toEqual({ count: 5 })
    expect(inserted.model.childrenById).toBe(model.childrenById)
    expect(inserted.model.rowsById).toBe(model.rowsById)
    expect(inserted.model.label).toBe(model.label)
    expect(inserted.commands?.map(command => command.name)).toEqual([
      'childrenByNumber[2]/Read',
    ])
  })

  it('rejects a duplicate Record key before child init', () => {
    const { model } = makeModel()

    expect(() =>
      initAndInsert(ChildrenByIdBinding, model, {
        key: firstId,
        args: [4],
      }),
    ).toThrow('cannot insert duplicate key')
    expect(initialized).not.toHaveBeenCalled()
  })

  it('rejects a duplicate HashMap key before child init', () => {
    const { model } = makeModel()

    expect(() =>
      initAndInsert(ChildrenByNumberBinding, model, { key: 1, args: [4] }),
    ).toThrow('cannot insert duplicate key')
    expect(initialized).not.toHaveBeenCalled()
  })

  it.each([EntryId.make('__proto__'), EntryId.make('constructor')])(
    'sets the prototype-named key %s as an own Record entry without changing its prototype',
    key => {
      const { model } = makeModel()
      const inserted = ParentBlock.operations.insertRecord(model, key, 4)

      expect(Object.hasOwn(inserted.model.childrenById, key)).toBe(true)
      expect(Reflect.get(inserted.model.childrenById, key)).toEqual({
        count: 4,
      })
      expect(Object.getPrototypeOf(inserted.model.childrenById)).toBe(
        Object.prototype,
      )
    },
  )

  it('rejects an unregistered graph before child initialization', () => {
    const { model } = makeModel()
    const recipe = initAndInsert(ChildrenByIdBinding, model, {
      key: secondId,
      args: [4],
    })

    expect(() =>
      withOperationGraph([], () => runBindingInitRecipe(recipe)),
    ).toThrow('not registered in the current Block graph')
    expect(initialized).not.toHaveBeenCalled()
  })

  it('defers the declared key Schema check to native Binding initialization', () => {
    const { model } = makeModel()
    const recipe = Reflect.apply(initAndInsert, undefined, [
      ChildrenByIdBinding,
      model,
      { key: 'x', args: [4] },
    ])

    expect(initialized).not.toHaveBeenCalled()
    expect(() =>
      withOperationGraph([ChildrenByIdBinding], () =>
        runBindingInitRecipe(recipe),
      ),
    ).toThrow('collection accessors could not inspect')
    expect(initialized).toHaveBeenCalledExactlyOnceWith(4)
  })

  it.each([
    undefined,
    {},
    { key: secondId, args: 4 },
    { key: 2, args: [4] },
    { key: secondId, args: [4], commands: Array.empty() },
    { key: secondId, args: [4], toParentModel: () => ({}) },
  ])('rejects malformed erased Record config %j before child init', config => {
    const { model } = makeModel()

    expect(() =>
      Reflect.apply(initAndInsert, undefined, [
        ChildrenByIdBinding,
        model,
        config,
      ]),
    ).toThrow()
    expect(initialized).not.toHaveBeenCalled()
  })

  it('rejects wrapped map storage and an incomplete parent Model', () => {
    const { model } = makeModel()

    expect(() =>
      Reflect.apply(initAndInsert, undefined, [
        RowsByIdBinding,
        model,
        { key: secondId, args: [4] },
      ]),
    ).toThrow('exact Record or HashMap child Binding')
    expect(() =>
      Reflect.apply(initAndInsert, undefined, [
        ChildrenByIdBinding,
        { ...model, label: 1 },
        { key: secondId, args: [4] },
      ]),
    ).toThrow('complete parent Model')
    expect(initialized).not.toHaveBeenCalled()
  })
})
