import { Effect, Number, Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import * as Update from '../update/index.js'
import { makeDefinition } from './define.js'
import * as Block from './public.js'

const Model = Schema.Struct({ count: Schema.Number })
const Message = defineMessageUnion({
  RequestedIncrement: { amount: Schema.Number },
  CompletedSave: {},
})
const Definition = makeDefinition('MessageStep', { Model, Message })
const Composition = Definition.makeComposition()
const Save = Definition.makeCommand('Save', {
  args: { count: Schema.Number },
  messages: [Message.CompletedSave],
})

it('contextually types an inline Message-only producer and applies its deferred Steps', () => {
  const update = Composition.makeUpdate({
    RequestedIncrement: Definition.makeStep.fromMessage(({ amount }) => {
      expectTypeOf(amount).toEqualTypeOf<number>()

      return Update.combineSteps([
        Definition.makeFieldsStep(() => ({ count: Number.sum(amount) })),
        Definition.makeCommandsStep(({ count }) => [Save({ count })]),
      ])
    }),
    CompletedSave: Definition.makeNoopStep(),
  })

  const model = Model.make({ count: 1 })
  const result = update(model, Message.RequestedIncrement({ amount: 3 }))

  expect(result.model.count).toBe(4)
  expect(result.commands).toMatchObject([{ args: { count: 4 } }])
})

it('defers the producer, preserves an unchanged Model and leaves Command execution to Runtime', async () => {
  const receivedMessages: Array<typeof Message.RequestedIncrement.Type> = []
  let executions = 0
  const Persist = Definition.makeCommand('Persist', {
    messages: [Message.CompletedSave],
    handler: function* () {
      return () =>
        Effect.sync(() => {
          executions += 1
          return Message.CompletedSave()
        })
    },
  })
  const command = Persist()
  const persistStep = Definition.makeStep.fromMessage(
    (message: typeof Message.RequestedIncrement.Type) => {
      receivedMessages.push(message)
      return Definition.makeCommandsStep(() => [command])
    },
  )
  const model = Model.make({ count: 2 })
  const message = Message.RequestedIncrement({ amount: 1 })

  expect(receivedMessages).toEqual([])

  const first = persistStep(model, message)
  const nextModel = Model.make({ count: 3 })
  const second = persistStep(nextModel, message)

  expect(first.model).toBe(model)
  expect(second.model).toBe(nextModel)
  expect(first.commands).toEqual([command])
  expect(second.commands).toEqual([command])
  expect(receivedMessages).toEqual([message, message])
  expect(executions).toBe(0)

  await Effect.runPromise(command.effect.pipe(Effect.provide(Persist.layer)))

  expect(executions).toBe(1)
})

it('accepts result-producing references and preserves declared OutMessages', () => {
  const OutMessage = defineMessageUnion({
    ReportedAmount: { amount: Schema.Number },
  })
  const ReportingDefinition = makeDefinition('MessageStepReporting', {
    Model,
    Message,
    OutMessage,
  })
  const ReportingComposition = ReportingDefinition.makeComposition()
  const report = ({ amount }: typeof Message.RequestedIncrement.Type) => ({
    model: Model.make({ count: amount }),
    outMessage: OutMessage.ReportedAmount({ amount }),
  })
  const update = ReportingComposition.makeUpdate({
    RequestedIncrement: ReportingDefinition.makeStep.fromMessage(report),
    CompletedSave: ReportingDefinition.makeStep.fromMessage(
      ReportingDefinition.makeNoopStep,
    ),
  })
  const model = Model.make({ count: 0 })
  const result = update(model, Message.RequestedIncrement({ amount: 5 }))

  expect(result.model.count).toBe(5)
  expect(result.outMessage).toEqual(OutMessage.ReportedAmount({ amount: 5 }))
  expect(update(Message.CompletedSave())(model).model).toBe(model)
})

it('closes over optional, default and rest dispatch context for direct and curried updates', () => {
  const update = Composition.makeUpdate.withContext(
    (multiplier: number = 2, ...offsets: ReadonlyArray<number>) => ({
      RequestedIncrement: Definition.makeStep.fromMessage(({ amount }) =>
        Definition.makeFieldsStep(() => ({
          count: count => count + amount * multiplier + offsets.length,
        })),
      ),
      CompletedSave: Definition.makeNoopStep(),
    }),
  )
  const model = Model.make({ count: 1 })
  const message = Message.RequestedIncrement({ amount: 3 })

  expect(update(model, message).model.count).toBe(7)
  expect(update(message)(model, 4, 0, 0).model.count).toBe(15)
})

it('interprets registered child Steps and passive child initialization recipes', () => {
  let initializations = 0
  const ChildDefinition = makeDefinition('MessageStepChild', { Model, Message })
  const ChildComposition = ChildDefinition.makeComposition()
  const prepare = () =>
    ChildComposition.prepareBlock({
      init: ChildComposition.makeInit((count: number) => {
        initializations += 1
        return { model: { count } }
      }),
      update: ChildComposition.makeUpdate({
        RequestedIncrement: ChildDefinition.makeFieldsStep.fromMessage(
          ({ amount }) => ({
            count: Number.sum(amount),
          }),
        ),
        CompletedSave: ChildDefinition.makeNoopStep(),
      }),
      operations: { increment: Message.RequestedIncrement },
    })
  const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
    typeof Model,
    typeof prepare
  > = Block.assemble(prepare)
  const ParentModel = Schema.Struct({ child: ChildBlock.Model })
  const ParentMessage = defineMessageUnion({
    RequestedIncrement: { amount: Schema.Number },
    RequestedReset: { count: Schema.Number },
  })
  const ParentDefinition = makeDefinition('MessageStepParent', {
    Model: ParentModel,
    Message: ParentMessage,
  })
  const ChildBinding = ParentDefinition.makeBinding(ChildBlock, {
    field: 'child',
    init: false,
  })
  const ParentComposition = ParentDefinition.makeComposition({
    bindings: [ChildBinding],
  })
  const update = ParentComposition.makeUpdate({
    RequestedIncrement: ParentDefinition.makeStep.fromMessage(({ amount }) =>
      ChildBinding.increment({ amount }),
    ),
    RequestedReset: ParentDefinition.makeStep.fromMessage(({ count }) =>
      ChildBinding.init({
        args: [count],
        toParentModel: child => ({ child }),
      }),
    ),
  })
  const model = ParentModel.make({ child: { count: 1 } })

  expect(initializations).toBe(0)
  expect(
    update(model, ParentMessage.RequestedIncrement({ amount: 2 })).model.child
      .count,
  ).toBe(3)
  expect(initializations).toBe(0)
  expect(
    update(ParentMessage.RequestedReset({ count: 5 }))(model).model.child.count,
  ).toBe(5)
  expect(initializations).toBe(1)
})
