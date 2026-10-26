import { Array, Effect, Layer, Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import * as Command from '../command/index.js'
import { modifyFields } from '../struct/index.js'
import * as Update from '../update/index.js'
import { makeDefinition } from './define.js'
import * as Block from './public.js'
import type { Scoped } from './scope.js'

const SilentModel = Schema.Struct({ ready: Schema.Boolean })
type SilentModel = typeof SilentModel.Type

const Silent = makeDefinition('MessageFreeKeyedRuntimeChild', {
  Model: SilentModel,
  Message: Schema.Never,
})
const WaitForever = Silent.makeCommand('WaitForever', {
  messages: [],
  handler: function* () {
    return () => Effect.never
  },
})
const markReadyStep = Silent.makeStep(model => ({
  model: modifyFields(model, { ready: () => true }),
  commands: [WaitForever()],
}))
const SilentComposition = Silent.makeComposition()
const silentUpdate = SilentComposition.makeUpdate({})
const prepareSilentBlock = () =>
  SilentComposition.prepareBlock({
    view: SilentComposition.makeView((_model, h) => h.empty),
    init: () => ({
      model: SilentModel.make({ ready: false }),
      commands: [WaitForever()],
    }),
    update: silentUpdate,
    operations: {},
    EffectsLayer: WaitForever.layer,
  })
const SilentBlock: Block.FromAssemblyWithView<
  typeof SilentModel,
  typeof prepareSilentBlock
> = Block.assemble(prepareSilentBlock)

if (false) {
  const mutatingExposeConfig = {
    view: SilentComposition.makeView((_model, h) => h.empty),
    init: () => ({
      model: SilentModel.make({ ready: false }),
      commands: [WaitForever()],
    }),
    update: silentUpdate,
    operations: { markReady: markReadyStep },
    EffectsLayer: WaitForever.layer,
  }
  // @ts-expect-error A Message-free Block cannot expose a mutating operation.
  SilentComposition.prepareBlock(mutatingExposeConfig)
}

const Entry = Schema.Struct({ id: Schema.String, child: SilentModel })
const ParentModel = Schema.Struct({ entries: Schema.Array(Entry) })
type ParentModel = typeof ParentModel.Type
const Parent = makeDefinition('MessageFreeKeyedRuntimeParent', {
  Model: ParentModel,
  Message: Schema.Never,
})
const SilentBinding = Parent.makeBinding(SilentBlock, {
  readAll: model => model.entries,
  key: entry => entry.id,
  read: entry => entry.child,
  writeAt: (model, id, nextChild) =>
    modifyFields(model, {
      entries: entries =>
        Array.map(entries, entry =>
          entry.id === id
            ? Entry.make({ id: entry.id, child: nextChild })
            : entry,
        ),
    }),
})
const ParentComposition = Parent.makeComposition({
  bindings: [SilentBinding],
})
const prepareParentBlock = () =>
  ParentComposition.prepareBlock({
    view: ParentComposition.makeView((_model, h) => h.empty),
    init: ParentComposition.makeInit(() =>
      SilentBinding.init({
        key: 'active',
        args: [],
        toParentModel: child =>
          ParentModel.make({
            entries: [Entry.make({ id: 'active', child })],
          }),
      }),
    ),
    update: ParentComposition.makeUpdate({}),
    operations: {},
    EffectsLayer: Layer.empty,
  })
const ParentBlock: Block.FromAssemblyWithView<
  typeof ParentModel,
  typeof prepareParentBlock
> = Block.assemble(prepareParentBlock)

it('keeps a Message-free general keyed child routeless across every channel', () => {
  const initial = ParentBlock.init().model

  expect(initial.entries).toEqual([{ id: 'active', child: { ready: false } }])
  expectTypeOf(silentUpdate).parameters.toEqualTypeOf<
    [model: SilentModel, message: never]
  >()
  expectTypeOf(SilentBinding.fold).parameter(2).toEqualTypeOf<never>()
  expectTypeOf<
    Layer.Services<typeof ParentBlock.EffectsLayer>
  >().toEqualTypeOf<never>()
  expectTypeOf<Layer.Success<typeof ParentBlock.EffectsLayer>>().toEqualTypeOf<
    Scoped<
      'MessageFreeKeyedRuntimeChild',
      Command.HandlerOf<typeof WaitForever>
    >
  >()
})

it('keeps local Message-free Steps internal to the child', () => {
  const initial = SilentBlock.init().model
  const result = markReadyStep(initial)

  expect(result.model).toEqual({ ready: true })
  expect(result.commands?.map(command => command.name)).toEqual([
    'MessageFreeKeyedRuntimeChild/WaitForever',
  ])
  expectTypeOf(result).toExtend<
    Update.Return<SilentModel, never, Command.HandlerOf<typeof WaitForever>>
  >()
})

it('rejects generated delivery configuration for a Message-free child', () => {
  expect(() =>
    Reflect.apply(Parent.makeBinding, undefined, [
      SilentBlock,
      {
        readAll: (model: ParentModel) => model.entries,
        key: (entry: typeof Entry.Type) => entry.id,
        read: (entry: typeof Entry.Type) => entry.child,
        writeAt: (model: ParentModel) => model,
        delivery: {},
      },
    ]),
  ).toThrow('[foldkit] A Message-free child cannot configure Message delivery.')
})
