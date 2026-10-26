import { Array, Effect, Option, Schema, Tuple } from 'effect'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as Update from '../update/index.js'
import { initAndAppend } from './bindingInit.js'
import { runBindingInitRecipe } from './initRecipe.js'
import { commandInstances } from './instanceContext.js'
import { withOperationGraph } from './operationGraph.js'
import * as Block from './public.js'

const ChildModel = Schema.Struct({ count: Schema.Number })
const ChildMessage = defineMessageUnion({
  CompletedRead: { count: Schema.Number },
})
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
  vi.fn<
    (
      key: string,
      child: typeof ChildModel.Type,
      args: ReadonlyArray<number>,
    ) => void
  >()
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
const Model = Schema.Struct({
  entries: Schema.Array(Entry),
  label: Schema.String,
})
const Message = defineMessageUnion({
  RequestedAppend: { key: Schema.String, count: Schema.Number },
  RequestedAppendPair: {},
})
const ParentDefinition = Block.makeDefinition('AppendParent', {
  Model,
  Message,
})
const EntriesBinding = ParentDefinition.makeBinding(ChildBlock, {
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
const appendStep = (key: string, count: number) =>
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
        Update.combineSteps([appendStep('first', 1), appendStep('second', 2)]),
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

beforeEach(() => {
  initialized.mockClear()
  wrapped.mockClear()
})

describe('initAndAppend', () => {
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
    const binding = ParentDefinition.makeBinding(ChildBlock, {
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
    ).toThrow('keyed array init.instances and init.toItem')
    expect(initialized).not.toHaveBeenCalled()
  })

  it.each(['wrong key', 'reconstructed child', 'discarded child'])(
    'rejects init.toItem with %s',
    mode => {
      const binding = ParentDefinition.makeBinding(ChildBlock, {
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
