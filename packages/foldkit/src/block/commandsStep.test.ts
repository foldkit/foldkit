import { Context, Effect, type Layer, Number, Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import * as Update from '../update/index.js'
import { makeDefinition } from './define.js'
import * as Block from './public.js'

const Model = Schema.Struct({ count: Schema.Number })
const Message = defineMessageUnion({ RequestedSave: {}, CompletedSave: {} })
const CommandsDefinition = makeDefinition('Commands', { Model, Message })
class Store extends Context.Service<Store, { save: Effect.Effect<void> }>()(
  'CommandsStep/Store',
) {}
const Save = CommandsDefinition.makeCommand('Save', {
  messages: [Message.CompletedSave],
  handler: function* () {
    return () =>
      Effect.gen(function* () {
        const store = yield* Store
        yield* store.save
        return Message.CompletedSave()
      })
  },
})

it('defers and repeats its producer while preserving the Model and exact Commands without executing Effects', async () => {
  let executions = 0
  const command = Save()
  const commands: ReadonlyArray<typeof command> = [command]
  const receivedModels: Array<typeof Model.Type> = []
  const save = CommandsDefinition.makeCommandsStep(model => {
    expectTypeOf(model).toEqualTypeOf<typeof Model.Type>()
    receivedModels.push(model)
    return commands
  })
  const model = Model.make({ count: 1 })

  expect(receivedModels).toEqual([])

  const result = save(model)
  const nextModel = Model.make({ count: 2 })
  const repeated = save(nextModel)

  expect(result.model).toBe(model)
  expect(repeated.model).toBe(nextModel)
  expect(result.commands).toBe(commands)
  expect(repeated.commands).toBe(commands)
  expect(receivedModels).toEqual([model, nextModel])
  expect(executions).toBe(0)
  expectTypeOf<typeof result.commands>().toEqualTypeOf<
    ReadonlyArray<typeof command>
  >()
  expectTypeOf<Update.RequirementsOf<typeof save>>().toEqualTypeOf<
    Update.RequirementsOf<() => typeof result>
  >()

  await Effect.runPromise(
    command.effect.pipe(
      Effect.provide(Save.layer),
      Effect.provideService(Store, {
        save: Effect.sync(() => {
          executions += 1
        }),
      }),
    ),
  )
  expect(executions).toBe(1)
})

it('composes sequential Model changes without losing Commands', () => {
  const SaveCount = CommandsDefinition.makeCommand('SaveCount', {
    args: { count: Schema.Number },
    messages: [Message.CompletedSave],
  })
  const model = Model.make({ count: 1 })
  const result = Update.combineSteps(model, [
    CommandsDefinition.makeFieldsStep(() => ({ count: Number.increment })),
    CommandsDefinition.makeCommandsStep(({ count }) => [SaveCount({ count })]),
    CommandsDefinition.makeFieldsStep(({ count }) => ({
      count: () => count * 2,
    })),
  ])

  expect(result.model.count).toBe(4)
  expect(result.commands).toHaveLength(1)
  expect(result.commands).toMatchObject([{ args: { count: 2 } }])
})

it('retains handler completeness and ordinary Service requirements', () => {
  const CommandsComposition = CommandsDefinition.makeComposition()
  const save = CommandsDefinition.makeCommandsStep(() => [Save()])
  const init = CommandsComposition.makeInit(() => ({ model: { count: 0 } }))
  const update = CommandsComposition.makeUpdate({
    RequestedSave: model => save(model),
    CompletedSave: model => ({ model }),
  })

  if (false) {
    // @ts-expect-error A Command-only Step still requires its handler Layer.
    CommandsComposition.prepareBlock({ init, update })
  }

  const prepareBlock = () =>
    CommandsComposition.prepareBlock({
      init,
      update,
      EffectsLayer: Save.layer,
    })
  const block: Block.FromAssemblyWithoutViewOrOutMessage<
    typeof Model,
    typeof prepareBlock
  > = Block.assemble(prepareBlock)
  expectTypeOf<
    Layer.Services<typeof block.EffectsLayer>
  >().toEqualTypeOf<Store>()
  expect(
    block.update(Model.make({ count: 0 }), Message.RequestedSave()).commands,
  ).toHaveLength(1)
})

it('retains registration obligations carried by a Command collection', () => {
  const ChildComposition = makeDefinition('CommandsStepIdentityChild', {
    Model,
    Message: Schema.Never,
  }).makeComposition()
  const prepareChildBlock = () =>
    ChildComposition.prepareBlock({
      init: ChildComposition.makeInit(() => ({ model: { count: 0 } })),
      update: ChildComposition.makeUpdate({}),
    })
  const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
    typeof Model,
    typeof prepareChildBlock
  > = Block.assemble(prepareChildBlock)
  const ParentModel = Schema.Struct({ child: Model })
  const ParentDefinition = makeDefinition('CommandsStepIdentityParent', {
    Model: ParentModel,
    Message,
  })
  const ChildBinding = ParentDefinition.makeBinding(ChildBlock, {
    field: 'child',
  })
  const ParentComposition = ParentDefinition.makeComposition({
    bindings: [ChildBinding],
  })
  type Evidence = Block.RequirementOfBinding<typeof ChildBinding>
  const commands: ReadonlyArray<ReturnType<typeof Save>> &
    Update.RegistrationEvidence<Evidence> = [Save()]
  const save = ParentDefinition.makeCommandsStep(() => commands)
  const update = ParentComposition.makeUpdate({
    RequestedSave: model => save(model),
    CompletedSave: model => save(model),
  })
  const model = ParentModel.make({ child: { count: 0 } })

  expect(update(model, Message.RequestedSave()).commands).toHaveLength(1)
  expectTypeOf<
    Update.RegistrationEvidenceOf<ReturnType<typeof save>>
  >().toEqualTypeOf<Evidence>()

  if (false) {
    // @ts-expect-error A plain Model cannot erase a Command collection's graph obligations.
    save(model)
    ParentDefinition.makeComposition().makeUpdate({
      // @ts-expect-error Missing child registration cannot be hidden by returning only Commands.
      RequestedSave: model => save(model),
      CompletedSave: ParentDefinition.makeNoopStep(),
    })
  }
})

if (false) {
  const OtherMessage = defineMessageUnion({ CompletedOther: {} })
  const other = {
    name: 'Other',
    effect: Effect.succeed(OtherMessage.CompletedOther()),
  }
  // @ts-expect-error Command result Messages must belong to the owning Block.
  CommandsDefinition.makeCommandsStep(() => [other])
  // @ts-expect-error The helper accepts a producer rather than an existing collection.
  CommandsDefinition.makeCommandsStep([Save()])
  // @ts-expect-error The callback returns Commands rather than an update result.
  CommandsDefinition.makeCommandsStep(model => ({ model }))
  // @ts-expect-error Compositions do not duplicate owned Step authoring.
  CommandsDefinition.makeComposition().makeCommandsStep
  // @ts-expect-error The produced Step still checks its owning Model.
  CommandsDefinition.makeCommandsStep(() => [])({ count: 'invalid' })
  // @ts-expect-error The producer receives the owning Model.
  CommandsDefinition.makeCommandsStep((_model: { count: string }) => [Save()])
  // @ts-expect-error The producer receives only the owning Model.
  CommandsDefinition.makeCommandsStep((_model, _extra: string) => [Save()])

  const widenedCommands: Update.Commands<typeof Message.Type> &
    Update.RegistrationEvidence<unknown> = []
  // @ts-expect-error The producer cannot erase concrete child registration evidence.
  CommandsDefinition.makeCommandsStep(() => widenedCommands)

  const erasedCommands: Update.Commands<typeof Message.Type> &
    Update.RegistrationEvidence<any> = []
  // @ts-expect-error Any registration evidence cannot hide a child graph obligation.
  CommandsDefinition.makeCommandsStep(() => erasedCommands)
}
