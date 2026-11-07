import { Array, Effect, Option, Schema, Tuple } from 'effect'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as Update from '../update/index.js'
import { registerBindingResolver } from './bindingConnection.js'
import { initAndAppend } from './bindingInit.js'
import { runBindingInitRecipe } from './initRecipe.js'
import { commandInstances } from './instanceContext.js'
import { withOperationGraph } from './operationGraph.js'
import * as Block from './public.js'

const ChildModel = Schema.Struct({ count: Schema.Number })
type ChildModel = typeof ChildModel.Type
const ChildMessage = defineMessageUnion({
  CompletedRead: { count: Schema.Number },
})
type ChildMessage = typeof ChildMessage.Type
const ChildDefinition = Block.makeDefinition('AppendChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
const Read = ChildDefinition.makeCommand('Read', {
  args: { count: Schema.Number },
  messages: [ChildMessage.CompletedRead],
  handler: function* () {
    return ({ count }) => Effect.succeed(ChildMessage.CompletedRead({ count }))
  },
})
const initialized = vi.fn<(count: number) => void>()
const wrapped =
  vi.fn<(key: string, child: ChildModel, args: ReadonlyArray<number>) => void>()
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
const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChild
> = Block.assemble(prepareChild)
const Entry = Schema.Struct({
  id: Schema.String,
  child: ChildBlock.Model,
  label: Schema.String,
})
type Entry = typeof Entry.Type
const Model = Schema.Struct({
  entries: Schema.Array(Entry),
  label: Schema.String,
})
type Model = typeof Model.Type
const Message = defineMessageUnion({
  RequestedAppend: { key: Schema.String, count: Schema.Number },
  RequestedAppendPair: {},
})
type Message = typeof Message.Type
const ParentDefinition = Block.makeDefinition('AppendParent', {
  Model,
  Message,
})
const EntriesBinding = ParentDefinition.makeKeyedArrayBinding(ChildBlock, {
  field: 'entries',
  key: 'id',
  childField: 'child',
  init: {
    instances: () => [],
    toItem: ({ key, args }, child) => {
      wrapped(key, child, args)
      return { id: key, child, label: `Entry ${key}` }
    },
  },
})
const Composition = ParentDefinition.makeComposition({
  bindings: [EntriesBinding],
})
const appendChild = (key: string, count: number) =>
  ParentDefinition.makeStep(model =>
    initAndAppend(EntriesBinding, model, { key, args: [count] }),
  )
const prepareParent = () =>
  Composition.prepareBlock({
    init: Composition.makeInit(() => ({ model: { label: 'current' } })),
    update: Composition.makeUpdate({
      RequestedAppend: (model, { key, count }) =>
        initAndAppend(EntriesBinding, model, { key, args: [count] }),
      RequestedAppendPair: ParentDefinition.makeStep(() =>
        Update.combineSteps([
          appendChild('first', 1),
          appendChild('second', 2),
        ]),
      ),
    }),
    operations: {
      append: (key: string, count: number) =>
        Tuple.make(Message.RequestedAppend({ key, count })),
      appendPair: () => Tuple.make(Message.RequestedAppendPair()),
    },
  })
const ParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepareParent
> = Block.assemble(prepareParent)

const DirectChildModel = Schema.Struct({
  id: Schema.String,
  count: Schema.Number,
})
type DirectChildModel = typeof DirectChildModel.Type
const DirectChildDefinition = Block.makeDefinition('DirectAppendChild', {
  Model: DirectChildModel,
  Message: ChildMessage,
})
const DirectRead = DirectChildDefinition.makeCommand('Read', {
  args: { count: Schema.Number },
  messages: [ChildMessage.CompletedRead],
  handler: function* () {
    return ({ count }) => Effect.succeed(ChildMessage.CompletedRead({ count }))
  },
})
const directInstances = vi.fn<
  () => ReadonlyArray<
    Readonly<{ key: string; args: readonly [id: string, count: number] }>
  >
>(() => [{ key: 'initial', args: ['initial', 1] }])
const directInitializedModels: globalThis.Array<DirectChildModel> = []
const DirectChildComposition = DirectChildDefinition.makeComposition()
const prepareDirectChild = () =>
  DirectChildComposition.prepareBlock({
    init: DirectChildComposition.makeInit((id: string, count: number) => {
      const model = DirectChildModel.make({ id, count })
      directInitializedModels.push(model)

      return { model, commands: [DirectRead({ count })] }
    }),
    update: DirectChildComposition.makeUpdate({
      CompletedRead: model => ({ model }),
    }),
    EffectsLayer: DirectRead.layer,
  })
const DirectChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof DirectChildModel,
  typeof prepareDirectChild
> = Block.assemble(prepareDirectChild)
const DirectModel = Schema.Struct({
  entries: Schema.Array(DirectChildModel),
  label: Schema.String,
})
const DirectParentDefinition = Block.makeDefinition('DirectAppendParent', {
  Model: DirectModel,
  Message,
})
const DirectEntriesBinding = DirectParentDefinition.makeKeyedArrayBinding(
  DirectChildBlock,
  {
    field: 'entries',
    key: 'id',
    init: { instances: () => directInstances() },
  },
)
const DirectParentComposition = DirectParentDefinition.makeComposition({
  bindings: [DirectEntriesBinding],
})

beforeEach(() => {
  initialized.mockClear()
  wrapped.mockClear()
  directInstances.mockClear()
  directInitializedModels.splice(0)
})

describe('initAndAppend', () => {
  it('uses identity storage lazily and preserves direct child init Commands', () => {
    const init = DirectParentComposition.makeInit(() => ({
      model: { label: 'current' },
    }))
    expect(directInstances).not.toHaveBeenCalled()
    expect(directInitializedModels).toEqual([])

    const initializedParent = init()
    const child = Option.getOrThrow(Array.head(initializedParent.model.entries))
    const initializedChild = Option.getOrThrow(
      Array.head(directInitializedModels),
    )

    expect(directInstances).toHaveBeenCalledExactlyOnceWith()
    expect(child).toStrictEqual(initializedChild)
    expect(initializedParent.commands).toMatchObject([
      { name: 'DirectAppendChild["initial"]/Read' },
    ])

    const recipe = initAndAppend(
      DirectEntriesBinding,
      initializedParent.model,
      { key: 'second', args: ['second', 2] },
    )
    expect(directInitializedModels).toHaveLength(1)

    const appended = withOperationGraph([DirectEntriesBinding], () =>
      runBindingInitRecipe(recipe, new Map()),
    )

    expect(appended).toMatchObject({
      model: {
        entries: [
          { id: 'initial', count: 1 },
          Option.getOrThrow(Array.last(directInitializedModels)),
        ],
      },
      commands: [{ name: 'DirectAppendChild["second"]/Read' }],
    })
  })

  it('rejects a default identity item whose child key differs from its plan', () => {
    const MismatchedEntriesBinding =
      DirectParentDefinition.makeKeyedArrayBinding(DirectChildBlock, {
        field: 'entries',
        key: 'id',
        placement: 'mismatchedEntries',
        init: {
          instances: () => [{ key: 'planned', args: ['initialized', 1] }],
        },
      })
    const MismatchedComposition = DirectParentDefinition.makeComposition({
      bindings: [MismatchedEntriesBinding],
    })
    const init = MismatchedComposition.makeInit(() => ({
      model: { label: 'current' },
    }))

    expect(() => init()).toThrow(
      'cannot initialize or replace a child with a different key',
    )
  })

  it('resolves deferred storage against the active graph and snapshots its arguments', () => {
    const DeferredBinding = ParentDefinition.makeKeyedArrayBinding(ChildBlock, {
      field: 'entries',
      key: 'id',
      childField: 'child',
      init: {
        instances: () => [],
        toItem: ({ key }, child) => ({ id: key, child, label: 'deferred' }),
      },
    })
    registerBindingResolver(DeferredBinding, environment => {
      const actual = environment?.get(DeferredBinding)

      if (actual === undefined) {
        throw new Error('The deferred Binding requires its graph.')
      }

      return actual
    })
    const args: [count: number] = [4]
    const config = { key: 'first', args }
    const recipe = initAndAppend(
      DeferredBinding,
      ParentBlock.init().model,
      config,
    )
    config.key = 'changed'
    args.splice(0, 1, 9)

    const appended = withOperationGraph([EntriesBinding], () =>
      runBindingInitRecipe(
        recipe,
        new Map([[DeferredBinding, EntriesBinding]]),
      ),
    )

    expect(appended).toMatchObject({
      model: {
        entries: [{ id: 'first', child: { count: 4 }, label: 'Entry first' }],
        label: 'current',
      },
      commands: [{ name: 'AppendChild["first"]/Read' }],
    })
    expect(initialized).toHaveBeenCalledExactlyOnceWith(4)
  })

  it('constructs a passive recipe and defers both child initialization and wrapper construction', () => {
    const recipe = initAndAppend(EntriesBinding, ParentBlock.init().model, {
      key: 'first',
      args: [4],
    })
    expect(recipe).not.toBeTypeOf('function')
    expect(recipe).not.toHaveProperty('model')
    expect(recipe).not.toHaveProperty('commands')
    expect(initialized).not.toHaveBeenCalled()
    expect(wrapped).not.toHaveBeenCalled()
  })

  it('appends to the current Model and preserves wrapper ownership, prior items, and qualified Commands', async () => {
    const existing = Entry.make({
      id: 'existing',
      child: { count: 8 },
      label: 'retained',
    })
    const model = modifyFields(ParentBlock.init().model, {
      entries: Array.append(existing),
    })
    const appended = ParentBlock.operations.append(model, 'first', 4)
    const command = Option.getOrThrow(Array.head(appended.commands ?? []))
    const message = await Effect.runPromise(
      Effect.provide(command.effect, ParentBlock.EffectsLayer),
    )

    expect(initialized).toHaveBeenCalledExactlyOnceWith(4)
    expect(wrapped).toHaveBeenCalledExactlyOnceWith('first', { count: 4 }, [4])
    expect(Option.getOrThrow(Array.head(appended.model.entries))).toBe(existing)
    expect(appended.model).toEqual({
      entries: [
        existing,
        { id: 'first', child: { count: 4 }, label: 'Entry first' },
      ],
      label: 'current',
    })
    expect(command.name).toBe('AppendChild["first"]/Read')
    expect(commandInstances(command)).toEqual([
      { binding: EntriesBinding, key: 'first', isInitialization: true },
    ])
    expect(message).toEqual({
      _tag: 'GotAppendChildMessage',
      placement: 'AppendChild',
      generation: 0,
      key: 'first',
      message: ChildMessage.CompletedRead({ count: 4 }),
    })
  })

  it('threads the current Model through sequential append Steps', () => {
    const appended = ParentBlock.operations.appendPair(ParentBlock.init().model)
    expect(appended.model.entries.map(entry => entry.id)).toEqual([
      'first',
      'second',
    ])
    expect(appended.commands?.map(command => command.name)).toEqual([
      'AppendChild["first"]/Read',
      'AppendChild["second"]/Read',
    ])
  })

  it('rejects duplicates before child initialization', () => {
    const model = Model.make({
      label: 'current',
      entries: [{ id: 'first', child: { count: 1 }, label: 'existing' }],
    })
    expect(() =>
      initAndAppend(EntriesBinding, model, { key: 'first', args: [4] }),
    ).toThrow('cannot append duplicate key')
    expect(initialized).not.toHaveBeenCalled()
    expect(wrapped).not.toHaveBeenCalled()
  })

  it('rejects an unregistered graph before child initialization', () => {
    const recipe = initAndAppend(EntriesBinding, ParentBlock.init().model, {
      key: 'first',
      args: [4],
    })
    expect(() =>
      withOperationGraph([], () => runBindingInitRecipe(recipe)),
    ).toThrow('not registered in the current Block graph')
    expect(initialized).not.toHaveBeenCalled()
  })

  it('snapshots arguments for both child init and toItem', () => {
    const args: [number] = [4]
    const recipe = initAndAppend(EntriesBinding, ParentBlock.init().model, {
      key: 'first',
      args,
    })
    args.splice(0, 1, 99)
    withOperationGraph([EntriesBinding], () => runBindingInitRecipe(recipe))
    expect(initialized).toHaveBeenCalledExactlyOnceWith(4)
    expect(wrapped).toHaveBeenCalledExactlyOnceWith('first', { count: 4 }, [4])
  })

  it('snapshots key and args before the config object is changed', () => {
    const args: [number] = [4]
    const config = { key: 'first', args }
    const recipe = initAndAppend(
      EntriesBinding,
      ParentBlock.init().model,
      config,
    )
    config.key = 'changed'
    config.args = Tuple.make(99)
    withOperationGraph([EntriesBinding], () => runBindingInitRecipe(recipe))
    expect(initialized).toHaveBeenCalledExactlyOnceWith(4)
    expect(wrapped).toHaveBeenCalledExactlyOnceWith('first', { count: 4 }, [4])
  })

  it.each([
    undefined,
    {},
    { key: 'first', args: 4 },
    { key: null, args: [4] },
    { key: Number.NaN, args: [4] },
    { key: Number.POSITIVE_INFINITY, args: [4] },
    { key: 'first', args: [4], commands: Array.empty() },
    { key: 'first', args: [4], toParentModel: () => ({}) },
    { key: 'first', args: [4], insertion: 'Append' },
  ])(
    'rejects malformed erased config %j before child initialization',
    config => {
      expect(() =>
        Reflect.apply(initAndAppend, undefined, [
          EntriesBinding,
          ParentBlock.init().model,
          config,
        ]),
      ).toThrow()
      expect(initialized).not.toHaveBeenCalled()
    },
  )

  it.each([
    { entries: [], label: 1 },
    { entries: Option.none(), label: 'current' },
    { label: 'current' },
    undefined,
  ])('rejects malformed parent Model %j before child initialization', model => {
    expect(() =>
      Reflect.apply(initAndAppend, undefined, [
        EntriesBinding,
        model,
        { key: 'first', args: [4] },
      ]),
    ).toThrow('complete parent Model')
    expect(initialized).not.toHaveBeenCalled()
  })

  it('rejects a Binding without stored initialization metadata', () => {
    const binding = ParentDefinition.makeKeyedArrayBinding(ChildBlock, {
      field: 'entries',
      key: 'id',
      childField: 'child',
    })
    expect(() =>
      Reflect.apply(initAndAppend, undefined, [
        binding,
        ParentBlock.init().model,
        { key: 'first', args: [4] },
      ]),
    ).toThrow('keyed array initialization')
    expect(initialized).not.toHaveBeenCalled()
  })

  it('rejects erased wrapped initialization without an item adapter', () => {
    expect(() =>
      Reflect.apply(ParentDefinition.makeKeyedArrayBinding, undefined, [
        ChildBlock,
        {
          field: 'entries',
          key: 'id',
          childField: 'child',
          init: { instances: () => [] },
        },
      ]),
    ).toThrow('must supply a toItem function')
  })

  it.each(['wrong key', 'reconstructed child', 'discarded child'])(
    'rejects init.toItem with %s',
    mode => {
      const binding = ParentDefinition.makeKeyedArrayBinding(ChildBlock, {
        field: 'entries',
        key: 'id',
        childField: 'child',
        init: {
          instances: () => [],
          toItem: ({ key }, child) => {
            if (mode === 'wrong key') {
              return { id: 'wrong', child, label: 'wrong' }
            } else if (mode === 'reconstructed child') {
              return {
                id: key,
                child: { count: child.count },
                label: 'reconstructed',
              }
            } else {
              return { id: key, child: { count: 99 }, label: 'discarded' }
            }
          },
        },
      })
      const recipe = initAndAppend(binding, ParentBlock.init().model, {
        key: 'first',
        args: [4],
      })
      expect(() =>
        withOperationGraph([binding], () => runBindingInitRecipe(recipe)),
      ).toThrow('init.toItem must preserve')
    },
  )
})
