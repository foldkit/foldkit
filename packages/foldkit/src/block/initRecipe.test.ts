import { Effect, Option, Schema } from 'effect'
import { expect, it, vi } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { makeDefinition } from './define.js'
import * as Block from './public.js'

const Config = Schema.Struct({ count: Schema.Number })
type Config = typeof Config.Type
const ChildModel = Schema.Struct({ count: Schema.Number })
type ChildModel = typeof ChildModel.Type
const ChildMessage = defineMessageUnion({ CompletedChildInit: {} })
type ChildMessage = typeof ChildMessage.Type
const Child = makeDefinition('InitRecipeSnapshotChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
const ChildComposition = Child.makeComposition()
const childInitialized = vi.fn((config: Config) => config.count)
const CompleteChildInit = Child.makeCommand('CompleteChildInit', {
  messages: [ChildMessage.CompletedChildInit],
  handler: function* () {
    return () => Effect.succeed(ChildMessage.CompletedChildInit())
  },
})
const prepareChildBlock = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit((config: Config) => ({
      model: ChildModel.make({ count: childInitialized(config) }),
      commands: [CompleteChildInit()],
    })),
    update: ChildComposition.makeUpdate({
      CompletedChildInit: model => ({ model }),
    }),
    EffectsLayer: CompleteChildInit.layer,
  })
const childBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

const ParentModel = Schema.Struct({ child: Schema.Option(ChildModel) })
type ParentModel = typeof ParentModel.Type
const ParentMessage = defineMessageUnion({
  CompletedParentInit: { label: Schema.String },
})
type ParentMessage = typeof ParentMessage.Type
const Parent = makeDefinition('InitRecipeSnapshotParent', {
  Model: ParentModel,
  Message: ParentMessage,
})
const CompleteParentInit = Parent.makeCommand('CompleteParentInit', {
  args: { label: Schema.String },
  messages: [ParentMessage.CompletedParentInit],
  handler: function* () {
    return ({ label }) =>
      Effect.succeed(ParentMessage.CompletedParentInit({ label }))
  },
})
const ChildBinding = Parent.makeBinding(childBlock, {
  field: 'child',
  init: false,
})
const ParentComposition = Parent.makeComposition({
  bindings: [ChildBinding],
})

it('snapshots a passive child init recipe without cloning its argument values', () => {
  childInitialized.mockClear()
  const config = Config.make({ count: 3 })
  const args: [Config] = [config]
  const originalCommand = CompleteParentInit({ label: 'original' })
  const replacementCommand = CompleteParentInit({ label: 'replacement' })
  const commands = [originalCommand]
  const toParentModel = vi.fn((child: ChildModel) =>
    ParentModel.make({ child: Option.some(child) }),
  )
  const initial = { args, commands, toParentModel }
  const recipe = ChildBinding.init(initial)

  expect(childInitialized).not.toHaveBeenCalled()
  expect(Object.isFrozen(recipe)).toBe(true)
  expect(Object.getPrototypeOf(recipe)).toBeNull()
  expect(Reflect.ownKeys(recipe)).toEqual([])

  args.splice(0, 1, Config.make({ count: 8 }))
  commands.splice(0, 1, replacementCommand)
  initial.args = [Config.make({ count: 9 })]
  initial.commands = [replacementCommand]
  initial.toParentModel = vi.fn(() =>
    ParentModel.make({ child: Option.none() }),
  )

  const init = ParentComposition.makeInit(() => recipe)
  const parentInit = init()

  expect(parentInit.model).toEqual(
    ParentModel.make({ child: Option.some(ChildModel.make({ count: 3 })) }),
  )
  expect(childInitialized).toHaveBeenCalledExactlyOnceWith(config)
  expect(childInitialized.mock.calls.at(0)?.at(0)).toBe(config)
  expect(toParentModel).toHaveBeenCalledOnce()
  expect(parentInit.commands).toHaveLength(2)
  expect(parentInit.commands?.at(1)).toBe(originalCommand)
})

const Item = Schema.Struct({ id: Schema.String, child: ChildModel })
type Item = typeof Item.Type
const KeyedModel = Schema.Struct({ items: Schema.Array(Item) })
type KeyedModel = typeof KeyedModel.Type
const Keyed = makeDefinition('InitRecipeSnapshotKeyedParent', {
  Model: KeyedModel,
  Message: Schema.Never,
})
const KeyedBinding = Keyed.makeBinding(childBlock, {
  field: 'items',
  key: 'id',
  childField: 'child',
})
const KeyedComposition = Keyed.makeComposition({
  bindings: [KeyedBinding],
})

it('snapshots the keyed identity and mapper before deferred child initialization', () => {
  childInitialized.mockClear()
  const config = Config.make({ count: 5 })
  const args: [Config] = [config]
  const toParentModel = vi.fn((child: ChildModel) =>
    KeyedModel.make({ items: [Item.make({ id: 'original', child })] }),
  )
  const initial = { key: 'original', args, toParentModel }
  const recipe = KeyedBinding.init(initial)

  expect(childInitialized).not.toHaveBeenCalled()

  args.splice(0, 1, Config.make({ count: 7 }))
  initial.key = 'replacement'
  initial.args = [Config.make({ count: 9 })]
  initial.toParentModel = vi.fn((child: ChildModel) =>
    KeyedModel.make({ items: [Item.make({ id: 'replacement', child })] }),
  )

  const init = KeyedComposition.makeInit(() => recipe)
  const parentInit = init()

  expect(parentInit.model).toEqual(
    KeyedModel.make({
      items: [
        Item.make({ id: 'original', child: ChildModel.make({ count: 5 }) }),
      ],
    }),
  )
  expect(childInitialized).toHaveBeenCalledExactlyOnceWith(config)
  expect(childInitialized.mock.calls.at(0)?.at(0)).toBe(config)
  expect(toParentModel).toHaveBeenCalledOnce()
  expect(parentInit.commands).toHaveLength(1)
})
