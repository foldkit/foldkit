import { Effect, Layer, Schema } from 'effect'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import * as Block from '../block/public.js'
import { defineInMessageUnion, defineMessageUnion } from '../message/index.js'
import * as Story from '../story/public.js'
import { modifyFields } from '../struct/index.js'
import * as Update from './public.js'

const ChildMessage = defineMessageUnion({ CompletedRecordIncrement: {} })
const ChildInMessage = defineInMessageUnion({ RequestedIncrement: {} })
const ChildKey = Symbol('CombinedSeedChild')
const ChildBlock = Block.make('CombinedSeedChild', {
  key: ChildKey,
  Model: Schema.Struct({ count: Schema.Number }),
  Message: ChildMessage,
  InMessage: ChildInMessage,
  InitArgs: Schema.Tuple([]),
  view: false,
})
const RecordIncrement = ChildBlock.makeCommand('RecordIncrement', {
  args: { count: Schema.Number },
  messages: [ChildMessage.CompletedRecordIncrement],
  handler: function* () {
    return () => Effect.succeed(ChildMessage.CompletedRecordIncrement())
  },
})
const ChildComposition = ChildBlock.makeComposition()
const childLayer = ChildBlock.makeLayer({
  init: ChildComposition.makeInit(() => ({ model: { count: 2 } })),
  update: ChildComposition.makeUpdate({
    CompletedRecordIncrement: ChildBlock.makeNoopStep(),
  }),
  inMessageUpdate: ChildComposition.makeInMessageUpdate({
    RequestedIncrement: model => ({
      model: modifyFields(model, { count: count => count + 1 }),
      commands: [RecordIncrement({ count: model.count + 1 })],
    }),
  }),
  EffectsLayer: RecordIncrement.layer,
})

const Message = defineMessageUnion({
  ClickedDirect: {},
  ClickedCurried: {},
  ClickedNested: {},
  CompletedRecordBefore: {},
  CompletedRecordAfter: {},
})
type Message = typeof Message.Type
const ParentKey = Symbol('CombinedSeedParent')
const ParentBlock = Block.make('CombinedSeedParent', {
  key: ParentKey,
  Model: Schema.Struct({ count: Schema.Number, child: ChildBlock.Model }),
  Message,
  InitArgs: Schema.Tuple([]),
  view: false,
})
const RecordBefore = ParentBlock.makeCommand('RecordBefore', {
  args: { count: Schema.Number },
  messages: [Message.CompletedRecordBefore],
  handler: function* () {
    return () => Effect.succeed(Message.CompletedRecordBefore())
  },
})
const RecordAfter = ParentBlock.makeCommand('RecordAfter', {
  args: { count: Schema.Number },
  messages: [Message.CompletedRecordAfter],
  handler: function* () {
    return () => Effect.succeed(Message.CompletedRecordAfter())
  },
})
const ChildBinding = ParentBlock.makeRequiredFieldBinding(ChildBlock, {
  field: 'child',
})
const ParentComposition = ParentBlock.makeComposition({
  bindings: [ChildBinding],
})
const increment = ParentBlock.makeStep(model => ({
  model: modifyFields(model, { count: count => count + 1 }),
  commands: [RecordBefore({ count: model.count + 1 })],
}))
const double = ParentBlock.makeStep(model => ({
  model: modifyFields(model, { count: count => count * 2 }),
  commands: [RecordAfter({ count: model.count * 2 })],
}))
const combined = ParentBlock.makeStep(() =>
  Update.combineSteps([increment, ChildBinding.requestIncrement(), double]),
)
const EffectsLayer = Layer.merge(RecordBefore.layer, RecordAfter.layer)
const layer = ParentBlock.makeLayer({
  init: ParentComposition.makeInit(() => ({ model: { count: 0 } })),
  update: ParentComposition.makeUpdate({
    ClickedDirect: model =>
      Update.combineSteps(modifyFields(model, { count: () => 10 }), [
        increment,
        ChildBinding.requestIncrement(),
        double,
      ]),
    ClickedCurried: model =>
      Update.combineSteps([increment, ChildBinding.requestIncrement(), double])(
        modifyFields(model, { count: () => 10 }),
      ),
    ClickedNested: model =>
      Update.combineSteps(modifyFields(model, { count: () => 15 }), [
        combined,
        ParentBlock.makeNoopStep(),
      ]),
    CompletedRecordBefore: ParentBlock.makeNoopStep(),
    CompletedRecordAfter: ParentBlock.makeNoopStep(),
  }),
  EffectsLayer,
}).pipe(Layer.provide(childLayer))

const expectCombinedChanges = (message: Message, countBefore: number) =>
  Story.story(
    { block: ParentBlock, layer },
    Story.init(),
    Story.models(Story.steps(Story.message(message)), (before, after) => {
      expect(before.count).toBe(0)
      expect(before.child.count).toBe(2)
      expect(after.count).toBe(countBefore * 2)
      expect(after.child.count).toBe(3)
    }),
    Story.Command.expectExactInOrder(
      RecordBefore({ count: countBefore }),
      RecordIncrement({ count: 3 }),
      RecordAfter({ count: countBefore * 2 }),
    ),
    Story.Command.resolve(RecordBefore, Message.CompletedRecordBefore()),
    Story.Command.resolve(
      RecordIncrement,
      ChildMessage.CompletedRecordIncrement(),
    ),
    Story.Command.resolve(RecordAfter, Message.CompletedRecordAfter()),
  )

describe('connected composition starting Models', () => {
  it.effect('retains an explicitly supplied Model in data-first form', () =>
    expectCombinedChanges(Message.ClickedDirect(), 11),
  )

  it.effect(
    'retains an explicitly supplied Model in applied data-last form',
    () => expectCombinedChanges(Message.ClickedCurried(), 11),
  )

  it.effect('retains each supplied Model through nested combinations', () =>
    expectCombinedChanges(Message.ClickedNested(), 16),
  )
})
