import { Effect, Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as Update from '../update/index.js'
import type { RequirementOfBinding } from './binding.js'
import { makeDefinition } from './define.js'
import * as Block from './public.js'

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type
const Message = defineMessageUnion({
  ChangedCount: { amount: Schema.Number },
  CompletedSave: {},
})
type Message = typeof Message.Type
const OutMessage = defineMessageUnion({
  ReportedCount: { count: Schema.Number },
})
type OutMessage = typeof OutMessage.Type

const Counter = makeDefinition('DualUpdateRuntimeCounter', {
  Model,
  Message,
  OutMessage,
})
const Save = Counter.makeCommand('Save', {
  messages: [Message.CompletedSave],
  handler: function* () {
    return () => Effect.succeed(Message.CompletedSave())
  },
})
const CounterComposition = Counter.makeComposition()
const changedCount = Message.ChangedCount({ amount: 2 })
const update = CounterComposition.makeUpdate({
  ChangedCount: (
    model,
    { amount },
  ): Update.Return<Model, Message, Command.HandlerOf<typeof Save>> => ({
    model: modifyFields(model, { count: count => count + amount }),
    commands: [Save()],
  }),
  CompletedSave: (
    model,
  ): Update.Return<Model, Message, Command.HandlerOf<typeof Save>> => ({
    model,
  }),
})
const reportUpdate = CounterComposition.makeUpdate({
  ChangedCount: (
    model,
    { amount },
  ): Update.ReturnWithOutMessage<Model, Message, OutMessage> => ({
    model,
    outMessage: OutMessage.ReportedCount({ count: model.count + amount }),
  }),
  CompletedSave: (
    model,
  ): Update.ReturnWithOutMessage<Model, Message, OutMessage> => ({ model }),
})

const ternaryUpdate = CounterComposition.makeUpdate({
  ChangedCount: model => ({
    model,
    commands: [Save()],
    outMessage: OutMessage.ReportedCount({ count: model.count }),
  }),
  CompletedSave: model => ({ model }),
})
const earlyReturnUpdate = CounterComposition.makeUpdate({
  ChangedCount: model => ({
    model,
    commands: [Save()],
    outMessage: OutMessage.ReportedCount({ count: model.count }),
  }),
  CompletedSave: model => ({ model }),
})
const rejectMissingBranchHandlers = () => {
  // @ts-expect-error A Command in one ternary branch still requires its handler.
  CounterComposition.prepareBlock({
    init: () => ({ model: Model.make({ count: 0 }) }),
    update: ternaryUpdate,
  })
  // @ts-expect-error A Command before an early return still requires its handler.
  CounterComposition.prepareBlock({
    init: () => ({ model: Model.make({ count: 0 }) }),
    update: earlyReturnUpdate,
  })
}
void rejectMissingBranchHandlers

const combineGenericSteps = <Model, Message, R>(
  model: Model,
  steps: ReadonlyArray<Update.Step<Model, Message, R>>,
) => Update.combineSteps<Model, Message, R>(model, steps)

type DispatchContext = Readonly<{ multiplier: number }>

const ContextComposition = makeDefinition('DualUpdateRuntimeContextCounter', {
  Model,
  Message,
}).makeComposition()
const requiredContextUpdate = ContextComposition.makeUpdate.withContext(
  (context: DispatchContext) => ({
    ChangedCount: (model, { amount }) => ({
      model: modifyFields(model, {
        count: count => count + amount * context.multiplier,
      }),
    }),
    CompletedSave: model => ({ model }),
  }),
)
const optionalContextUpdate = ContextComposition.makeUpdate.withContext(
  (context?: DispatchContext) => ({
    ChangedCount: (model, _message) => ({
      model: modifyFields(model, {
        count: count => count + (context?.multiplier ?? 1),
      }),
    }),
    CompletedSave: (model, _message) => ({
      model: modifyFields(model, {
        count: count => count + (context?.multiplier ?? 1),
      }),
    }),
  }),
)
const defaultContextUpdate = ContextComposition.makeUpdate.withContext(
  (context: DispatchContext = { multiplier: 1 }) => ({
    ChangedCount: (model, _message) => ({
      model: modifyFields(model, {
        count: count => count + context.multiplier,
      }),
    }),
    CompletedSave: (model, _message) => ({
      model: modifyFields(model, {
        count: count => count + context.multiplier,
      }),
    }),
  }),
)
const restContextUpdate = ContextComposition.makeUpdate.withContext(
  (...contexts: ReadonlyArray<DispatchContext>) => ({
    ChangedCount: (model, _message) => ({
      model: modifyFields(model, {
        count: count =>
          count +
          contexts.reduce((total, context) => total + context.multiplier, 0),
      }),
    }),
    CompletedSave: (model, _message) => ({
      model: modifyFields(model, {
        count: count =>
          count +
          contexts.reduce((total, context) => total + context.multiplier, 0),
      }),
    }),
  }),
)
const requiredRestContextUpdate = ContextComposition.makeUpdate.withContext(
  (
    ...contexts: readonly [DispatchContext, ...ReadonlyArray<DispatchContext>]
  ) => ({
    ChangedCount: (model, { amount }) => ({
      model: modifyFields(model, {
        count: count =>
          count +
          amount +
          contexts.reduce((total, context) => total + context.multiplier, 0),
      }),
    }),
    CompletedSave: model => ({
      model: modifyFields(model, {
        count: count =>
          count +
          contexts.reduce((total, context) => total + context.multiplier, 0),
      }),
    }),
  }),
)

const fullChannelUpdate = CounterComposition.makeUpdate.withContext(
  (context: DispatchContext) => ({
    ChangedCount: (model, { amount }) => {
      const nextModel = modifyFields(model, {
        count: count => count + amount * context.multiplier,
      })
      return {
        model: nextModel,
        commands: [Save()],
        outMessage: OutMessage.ReportedCount({ count: nextModel.count }),
      }
    },
    CompletedSave: model => {
      const nextModel = modifyFields(model, {
        count: count => count,
      })
      return {
        model: nextModel,
        commands: [Save()],
        outMessage: OutMessage.ReportedCount({ count: nextModel.count }),
      }
    },
  }),
)
const prepareFullChannelBlock = () =>
  CounterComposition.prepareBlock({
    view: CounterComposition.makeView((_model, h) => h.empty),
    init: () => ({ model: Model.make({ count: 0 }) }),
    update: fullChannelUpdate,
    operations: {},
    EffectsLayer: Save.layer,
  })
const FullChannelBlock: Block.FromAssemblyWithViewAndOutMessage<
  typeof Model,
  typeof prepareFullChannelBlock
> = Block.assemble(prepareFullChannelBlock)

const ChildModel = Schema.Struct({ count: Schema.Number })
type ChildModel = typeof ChildModel.Type
const ChildMessage = defineMessageUnion({
  ChangedCount: { amount: Schema.Number },
})
type ChildMessage = typeof ChildMessage.Type

const ChildComposition = makeDefinition('DualUpdateRuntimeChild', {
  Model: ChildModel,
  Message: ChildMessage,
}).makeComposition()
const prepareChildBlock = () =>
  ChildComposition.prepareBlock({
    init: () => ({ model: ChildModel.make({ count: 0 }) }),
    update: ChildComposition.makeUpdate({
      ChangedCount: (model, { amount }) => ({
        model: modifyFields(model, { count: count => count + amount }),
      }),
    }),
  })
const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)
const ParentModel = Schema.Struct({ child: ChildModel, updates: Schema.Number })
type ParentModel = typeof ParentModel.Type
const ParentMessage = defineMessageUnion({
  Advanced: {},
})
type ParentMessage = typeof ParentMessage.Type
const Parent = makeDefinition('DualUpdateRuntimeParent', {
  Model: ParentModel,
  Message: ParentMessage,
})
const ChildBinding = Parent.makeBinding(ChildBlock, {
  field: 'child',
})
const ParentComposition = Parent.makeComposition({
  bindings: [ChildBinding],
})
const parentUpdate = ParentComposition.makeUpdate({
  Advanced: model => ({
    model: modifyFields(model, { updates: updates => updates + 1 }),
  }),
})
const parentMessage = {
  _tag: 'GotChildMessage',
  placement: 'child',
  generation: 0,
  message: ChildMessage.ChangedCount({ amount: 4 }),
} satisfies Parameters<typeof parentUpdate>[1]
const parentModel = ParentModel.make({
  child: ChildModel.make({ count: 0 }),
  updates: 0,
})
const prepareParentBlock = () =>
  ParentComposition.prepareBlock({
    init: () => ({ model: parentModel }),
    update: parentUpdate,
  })
const ParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareParentBlock
> = Block.assemble(prepareParentBlock)

it('runs direct and Message-first curried updates identically', () => {
  const model = Model.make({ count: 1 })
  const direct = update(model, changedCount)
  const curried = update(changedCount)(model)

  expect(direct.model).toEqual(curried.model)
  expect(direct.commands?.map(command => command.name)).toEqual(
    curried.commands?.map(command => command.name),
  )
  expect(reportUpdate(model, changedCount)).toEqual(
    reportUpdate(changedCount)(model),
  )
  expect(update.length).toBe(2)
  expect(update(changedCount).length).toBe(1)
})

it('retains branch Commands and OutMessage beside a pure return', () => {
  const model = Model.make({ count: 3 })

  for (const branchUpdate of [ternaryUpdate, earlyReturnUpdate]) {
    const changed = branchUpdate(model, changedCount)
    const completed = branchUpdate(model, Message.CompletedSave())

    expect(changed.model).toBe(model)
    expect(changed.commands?.map(command => command.name)).toEqual([Save.name])
    expect(changed.outMessage).toEqual(
      OutMessage.ReportedCount({ count: model.count }),
    )
    expect(completed).toEqual({ model })
    expect(branchUpdate(changedCount)(model).outMessage).toEqual(
      changed.outMessage,
    )
  }

  expectTypeOf<ReturnType<typeof ternaryUpdate>>().toEqualTypeOf<
    Update.ReturnWithOutMessage<
      Model,
      Message,
      OutMessage,
      Command.HandlerOf<typeof Save>
    >
  >()
  expectTypeOf<ReturnType<typeof earlyReturnUpdate>>().toEqualTypeOf<
    Update.ReturnWithOutMessage<
      Model,
      Message,
      OutMessage,
      Command.HandlerOf<typeof Save>
    >
  >()
  expectTypeOf<Update.RequirementsOf<typeof ternaryUpdate>>().toEqualTypeOf<
    Command.HandlerOf<typeof Save>
  >()
  expectTypeOf<Update.RequirementsOf<typeof earlyReturnUpdate>>().toEqualTypeOf<
    Command.HandlerOf<typeof Save>
  >()
})

it('keeps a generic no-op Step and Command Step precise in either order', () => {
  const model = Model.make({ count: 3 })
  const commandsStep = Counter.makeCommandsStep(() => [Save()])
  const commandsLast = Update.combineSteps(model, [
    Counter.makeNoopStep(),
    commandsStep,
  ])
  const commandsFirst = Update.combineSteps(model, [
    commandsStep,
    Counter.makeNoopStep(),
  ])
  const genericCommands = combineGenericSteps(model, [commandsStep])

  expect(commandsLast.model).toBe(model)
  expect(commandsFirst.model).toBe(model)
  expect(genericCommands.model).toBe(model)
  expect(commandsLast.commands?.map(command => command.name)).toEqual([
    Save.name,
  ])
  expect(commandsFirst.commands?.map(command => command.name)).toEqual([
    Save.name,
  ])
  expectTypeOf(commandsLast.model).toEqualTypeOf<Model>()
  expectTypeOf(commandsFirst.model).toEqualTypeOf<Model>()
  expectTypeOf<
    Update.RequirementsOf<() => typeof commandsLast>
  >().toEqualTypeOf<Command.HandlerOf<typeof Save>>()
  expectTypeOf<
    Update.RequirementsOf<() => typeof commandsFirst>
  >().toEqualTypeOf<Command.HandlerOf<typeof Save>>()
  expectTypeOf<
    Update.RequirementsOf<() => typeof genericCommands>
  >().toEqualTypeOf<Command.HandlerOf<typeof Save>>()
})

it('supplies required, optional, default, rest, and required-rest Context', () => {
  const model = Model.make({ count: 0 })

  expect(
    requiredContextUpdate(changedCount)(model, { multiplier: 3 }).model.count,
  ).toBe(6)
  expect(requiredContextUpdate(model, changedCount, { multiplier: 3 })).toEqual(
    requiredContextUpdate(changedCount)(model, { multiplier: 3 }),
  )
  expect(optionalContextUpdate(changedCount)(model).model.count).toBe(1)
  expect(defaultContextUpdate(changedCount)(model).model.count).toBe(1)
  expect(
    restContextUpdate(changedCount)(model, { multiplier: 2 }, { multiplier: 3 })
      .model.count,
  ).toBe(5)
  expect(
    requiredRestContextUpdate(changedCount)(model, { multiplier: 4 }).model
      .count,
  ).toBe(6)
  expect(optionalContextUpdate(model, changedCount)).toEqual(
    optionalContextUpdate(changedCount)(model),
  )
  expect(defaultContextUpdate(model, changedCount)).toEqual(
    defaultContextUpdate(changedCount)(model),
  )
  expect(
    restContextUpdate(
      model,
      changedCount,
      { multiplier: 2 },
      { multiplier: 3 },
    ),
  ).toEqual(
    restContextUpdate(changedCount)(
      model,
      { multiplier: 2 },
      { multiplier: 3 },
    ),
  )
  expect(
    requiredRestContextUpdate(model, changedCount, { multiplier: 4 }),
  ).toEqual(requiredRestContextUpdate(changedCount)(model, { multiplier: 4 }))
})

it('preserves Model, Commands, and OutMessage through completion and currying', () => {
  const model = Model.make({ count: 0 })
  const direct = FullChannelBlock.update(model, changedCount, {
    multiplier: 3,
  })
  const curried = FullChannelBlock.update(changedCount)(model, {
    multiplier: 3,
  })

  expect(direct.model).toEqual(curried.model)
  expect(direct.outMessage).toEqual(curried.outMessage)
  expect(direct.commands?.map(command => command.name)).toEqual(
    curried.commands?.map(command => command.name),
  )
})

it('keeps graph evidence while authored and removes it after completion', () => {
  const direct = parentUpdate(parentModel, parentMessage)
  const curried = parentUpdate(parentMessage)(parentModel)
  const combined = Update.combineSteps(parentModel, [
    parentUpdate(parentMessage),
    stepModel => ({
      model: modifyFields(stepModel, {
        updates: updates => updates + 1,
      }),
    }),
  ])
  const completedStep = ParentBlock.update(parentMessage)

  expect(direct).toEqual(curried)
  expect(combined.model).toEqual({ child: { count: 4 }, updates: 1 })
  expect(completedStep(parentModel).model).toEqual({
    child: { count: 4 },
    updates: 0,
  })
  expectTypeOf<
    Update.RegistrationEvidenceOf<ReturnType<typeof parentUpdate>>
  >().toEqualTypeOf<RequirementOfBinding<typeof ChildBinding>>()
  expectTypeOf<
    Update.RegistrationEvidenceOf<ReturnType<typeof ParentBlock.update>>
  >().toEqualTypeOf<never>()
  expectTypeOf(completedStep).parameters.toEqualTypeOf<[model: ParentModel]>()
})
