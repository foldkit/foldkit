import { Effect, Schema, Tuple } from 'effect'
import { expect, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as Update from '../update/index.js'
import * as Block from './public.js'

it('authors records and public operations passively, then preserves results and Commands', async () => {
  const Model = Schema.Struct({ count: Schema.Number })
  const Message = defineMessageUnion({
    RequestedAdd: { amount: Schema.Number },
    CompletedSave: {},
  })
  const OutMessage = defineMessageUnion({
    ReportedCount: { count: Schema.Number },
  })
  const Definition = Block.makeDefinition('RecordRuntime', {
    Model,
    Message,
    OutMessage,
  })
  let handlerCalls = 0
  let operationCalls = 0
  let effectCalls = 0
  const Save = Definition.makeCommand('Save', {
    messages: [Message.CompletedSave],
    handler: function* () {
      return () =>
        Effect.sync(() => {
          effectCalls += 1
          return Message.CompletedSave()
        })
    },
  })
  const Composition = Definition.makeComposition()
  const update = Composition.makeUpdate({
    RequestedAdd: (model, { amount }) => {
      handlerCalls += 1
      return {
        model: modifyFields(model, { count: count => count + amount }),
        commands: [Save()],
        outMessage: OutMessage.ReportedCount({ count: model.count + amount }),
      }
    },
    CompletedSave: Definition.makeNoopStep(),
  })
  const prepare = () =>
    Composition.prepareBlock({
      init: Composition.makeInit(() => ({ model: Model.make({ count: 0 }) })),
      update,
      operations: {
        add: Message.RequestedAdd,
        addAmount: (amount: number) => {
          operationCalls += 1
          return Tuple.make(Message.RequestedAdd({ amount }))
        },
      },
      EffectsLayer: Save.layer,
    })
  const block: Block.FromAssemblyWithOutMessage<typeof Model, typeof prepare> =
    Block.assemble(prepare)
  expect([handlerCalls, operationCalls, effectCalls]).toEqual([0, 0, 0])

  const model = Model.make({ count: 2 })
  const direct = block.operations.add(model, { amount: 3 })
  const tuple = block.operations.addAmount(model, 3)
  const curried = update(Message.RequestedAdd({ amount: 3 }))(model)
  expect([direct.model, tuple.model, curried.model]).toEqual([
    { count: 5 },
    { count: 5 },
    { count: 5 },
  ])
  expect([direct.outMessage, tuple.outMessage, curried.outMessage]).toEqual([
    OutMessage.ReportedCount({ count: 5 }),
    OutMessage.ReportedCount({ count: 5 }),
    OutMessage.ReportedCount({ count: 5 }),
  ])
  expect([handlerCalls, operationCalls, effectCalls]).toEqual([3, 1, 0])
  await Effect.runPromise(
    Effect.forEach(direct.commands ?? [], command => command.effect).pipe(
      Effect.provide(Save.layer),
    ),
  )
  expect(effectCalls).toBe(1)
})

it('evaluates context factories only for dispatch and preserves direct, curried, and operation contexts', () => {
  const Model = Schema.Struct({ count: Schema.Number })
  const Message = defineMessageUnion({
    RequestedScale: { amount: Schema.Number },
  })
  const Definition = Block.makeDefinition('RecordContextRuntime', {
    Model,
    Message,
  })
  const Composition = Definition.makeComposition()
  let factoryCalls = 0
  let handlerCalls = 0
  const update = Composition.makeUpdate.withContext((multiplier: number) => {
    factoryCalls += 1
    return {
      RequestedScale: (model, { amount }) => {
        handlerCalls += 1
        return {
          model: modifyFields(model, { count: () => amount * multiplier }),
        }
      },
    }
  })
  const prepare = () =>
    Composition.prepareBlock({
      init: Composition.makeInit(() => ({ model: Model.make({ count: 0 }) })),
      update,
      operations: {
        scale: Message.RequestedScale,
        scaleAmount: (amount: number, multiplier: number) =>
          Tuple.make(Message.RequestedScale({ amount }), multiplier),
      },
    })
  const block: Block.FromAssemblyWithoutViewOrOutMessage<
    typeof Model,
    typeof prepare
  > = Block.assemble(prepare)
  expect([factoryCalls, handlerCalls]).toEqual([0, 0])
  const model = Model.make({ count: 0 })
  const message = Message.RequestedScale({ amount: 3 })
  expect(update(model, message, 4).model.count).toBe(12)
  expect(update(message)(model, 4).model.count).toBe(12)
  expect(block.operations.scale(model, { amount: 3 }, 4).model.count).toBe(12)
  expect(block.operations.scaleAmount(model, 3, 4).model.count).toBe(12)
  expect([factoryCalls, handlerCalls]).toEqual([4, 4])

  const optional = Composition.makeUpdate.withContext(
    (multiplier?: number) => ({
      RequestedScale: (model, { amount }) => ({
        model: modifyFields(model, { count: () => amount * (multiplier ?? 1) }),
      }),
    }),
  )
  const defaulted = Composition.makeUpdate.withContext(
    (multiplier: number = 2) => ({
      RequestedScale: (model, { amount }) => ({
        model: modifyFields(model, { count: () => amount * multiplier }),
      }),
    }),
  )
  const rest = Composition.makeUpdate.withContext(
    (...multipliers: ReadonlyArray<number>) => ({
      RequestedScale: (model, { amount }) => ({
        model: modifyFields(model, {
          count: () =>
            multipliers.reduce(
              (product, multiplier) => product * multiplier,
              amount,
            ),
        }),
      }),
    }),
  )
  const requiredRest = Composition.makeUpdate.withContext(
    (...[multiplier]: readonly [multiplier: number]) => ({
      RequestedScale: (model, { amount }) => ({
        model: modifyFields(model, { count: () => amount * multiplier }),
      }),
    }),
  )
  expect(optional(model, message).model.count).toBe(3)
  expect(optional(message)(model, 5).model.count).toBe(15)
  expect(defaulted(model, message).model.count).toBe(6)
  expect(defaulted(message)(model, 5).model.count).toBe(15)
  expect(rest(model, message).model.count).toBe(3)
  expect(rest(message)(model, 2, 3).model.count).toBe(18)
  expect(requiredRest(model, message, 5).model.count).toBe(15)
  expect(requiredRest(message)(model, 5).model.count).toBe(15)
})

it('does not evaluate context factories for generated child-envelope delivery', async () => {
  const ChildModel = Schema.Struct({
    count: Schema.Number,
    savedCount: Schema.Number,
  })
  const ChildMessage = defineMessageUnion({
    RequestedAdd: { amount: Schema.Number },
    CompletedSave: { count: Schema.Number },
  })
  const ChildDefinition = Block.makeDefinition('RecordContextChild', {
    Model: ChildModel,
    Message: ChildMessage,
  })
  const Save = ChildDefinition.makeCommand('Save', {
    args: { count: Schema.Number },
    messages: [ChildMessage.CompletedSave],
    handler: function* () {
      return ({ count }) =>
        Effect.succeed(ChildMessage.CompletedSave({ count }))
    },
  })
  const ChildComposition = ChildDefinition.makeComposition()
  const childUpdate = ChildComposition.makeUpdate({
    RequestedAdd: (model, { amount }) => {
      const nextCount = model.count + amount
      return {
        model: modifyFields(model, { count: () => nextCount }),
        commands: [Save({ count: nextCount })],
      }
    },
    CompletedSave: (model, { count }) => ({
      model: modifyFields(model, { savedCount: () => count }),
    }),
  })
  const prepareChild = () =>
    ChildComposition.prepareBlock({
      init: ChildComposition.makeInit(() => ({
        model: ChildModel.make({ count: 0, savedCount: 0 }),
      })),
      update: childUpdate,
      EffectsLayer: Save.layer,
    })
  const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
    typeof ChildModel,
    typeof prepareChild
  > = Block.assemble(prepareChild)
  const ParentModel = Schema.Struct({
    child: ChildModel,
    scaledCount: Schema.Number,
  })
  const ParentMessage = defineMessageUnion({
    RequestedScale: { amount: Schema.Number },
  })
  const ParentDefinition = Block.makeDefinition('RecordContextParent', {
    Model: ParentModel,
    Message: ParentMessage,
  })
  const ChildBinding = ParentDefinition.makeBinding(ChildBlock, {
    field: 'child',
  })
  const ParentComposition = ParentDefinition.makeComposition({
    bindings: [ChildBinding],
  })
  let factoryCalls = 0
  let handlerCalls = 0
  const parentUpdate = ParentComposition.makeUpdate.withContext(
    (multiplier: number) => {
      factoryCalls += 1
      return {
        RequestedScale: (model, { amount }) => {
          handlerCalls += 1
          return {
            model: modifyFields(model, {
              scaledCount: () => amount * multiplier,
            }),
          }
        },
      }
    },
  )
  const init = ParentComposition.makeInit(() => ({ model: { scaledCount: 0 } }))
  const prepareParent = () =>
    ParentComposition.prepareBlock({ init, update: parentUpdate })
  const ParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
    typeof ParentModel,
    typeof prepareParent
  > = Block.assemble(prepareParent)
  expect([factoryCalls, handlerCalls]).toEqual([0, 0])

  const scaled = parentUpdate(
    init().model,
    ParentMessage.RequestedScale({ amount: 3 }),
    2,
  )
  expect(scaled.model.scaledCount).toBe(6)
  expect([factoryCalls, handlerCalls]).toEqual([1, 1])
  const childMessage = Schema.decodeSync(ParentComposition.Message)({
    _tag: 'GotChildMessage',
    placement: 'child',
    generation: 0,
    message: ChildMessage.RequestedAdd({ amount: 4 }),
  })
  const childAdd = parentUpdate(scaled.model, childMessage, 99)
  expect(childAdd.model.child.count).toBe(4)
  expect(childAdd.model.scaledCount).toBe(6)
  expect(childAdd.commands?.map(command => command.name)).toEqual([
    'child/Save',
  ])
  expect([factoryCalls, handlerCalls]).toEqual([1, 1])

  const completions = await Effect.runPromise(
    Effect.forEach(childAdd.commands ?? [], command => command.effect).pipe(
      Effect.provide(ParentBlock.EffectsLayer),
    ),
  )
  const saved = completions.reduce(
    (model, message) => parentUpdate(message)(model, 99).model,
    childAdd.model,
  )
  expect(saved.child.savedCount).toBe(4)
  expect(saved.scaledCount).toBe(6)
  expect([factoryCalls, handlerCalls]).toEqual([1, 1])
})

it('runs a silent child combination while retaining an emitting operation directly', () => {
  const ChildModel = Schema.Struct({ count: Schema.Number })
  const ChildMessage = defineMessageUnion({
    RequestedIncrement: {},
    RequestedReport: {},
  })
  const OutMessage = defineMessageUnion({
    ReportedCount: { count: Schema.Number },
  })
  const ChildDefinition = Block.makeDefinition('RecordConnectedChild', {
    Model: ChildModel,
    Message: ChildMessage,
    OutMessage,
  })
  const ChildComposition = ChildDefinition.makeComposition()
  const childUpdate = ChildComposition.makeUpdate({
    RequestedIncrement: ChildDefinition.makeFieldsStep(() => ({
      count: count => count + 1,
    })),
    RequestedReport: ChildDefinition.makeOutMessageStep(model =>
      OutMessage.ReportedCount({ count: model.count }),
    ),
  })
  const prepareChild = () =>
    ChildComposition.prepareBlock({
      init: ChildComposition.makeInit(() => ({
        model: ChildModel.make({ count: 0 }),
      })),
      update: childUpdate,
      operations: {
        increment: ChildMessage.RequestedIncrement,
        report: ChildMessage.RequestedReport,
      },
    })
  const ChildBlock: Block.FromAssemblyWithOutMessage<
    typeof ChildModel,
    typeof prepareChild
  > = Block.assemble(prepareChild)
  const ParentModel = Schema.Struct({ child: ChildModel })
  const ParentMessage = defineMessageUnion({
    RequestedIncrement: {},
    RequestedReport: {},
  })
  const ParentDefinition = Block.makeDefinition('RecordConnectedParent', {
    Model: ParentModel,
    Message: ParentMessage,
    OutMessage,
  })
  const ChildBinding = ParentDefinition.makeBinding(ChildBlock, {
    field: 'child',
  }).withOutMessagePolicy({
    forward: ParentDefinition.makeOutMessageForward(ChildBlock, {
      ReportedCount: ({ count }) => OutMessage.ReportedCount({ count }),
    }),
  })
  const ParentComposition = ParentDefinition.makeComposition({
    bindings: [ChildBinding],
  })
  const parentUpdate = ParentComposition.makeUpdate({
    RequestedIncrement: model =>
      Update.combineSteps(model, [
        ChildBinding.increment(),
        ParentDefinition.makeNoopStep(),
      ]),
    RequestedReport: model => ChildBinding.report()(model),
  })
  const model = ParentModel.make({ child: ChildModel.make({ count: 0 }) })
  const incremented = parentUpdate(model, ParentMessage.RequestedIncrement())
  expect(incremented.model.child.count).toBe(1)
  expect(incremented.outMessage).toBeUndefined()
  const reported = parentUpdate(
    incremented.model,
    ParentMessage.RequestedReport(),
  )
  expect(reported.outMessage).toEqual(OutMessage.ReportedCount({ count: 1 }))
})
