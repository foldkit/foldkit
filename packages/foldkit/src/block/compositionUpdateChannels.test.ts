import { Effect, Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as Update from '../update/index.js'
import type { RequirementOfBinding } from './binding.js'
import { makeDefinition } from './define.js'
import * as Block from './public.js'

const ChildModel = Schema.Struct({ count: Schema.Number })
const ChildMessage = defineMessageUnion({
  RequestedIncrement: {},
  CompletedChildSave: {},
})
const ChildDefinition = makeDefinition('CompositionUpdateChannelsChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
const ChildSave = ChildDefinition.makeCommand('ChildSave', {
  messages: [ChildMessage.CompletedChildSave],
  handler: function* () {
    return () => Effect.succeed(ChildMessage.CompletedChildSave())
  },
})
const ChildComposition = ChildDefinition.makeComposition()
const childUpdate = ChildComposition.makeUpdate({
  RequestedIncrement: (
    model,
  ): Update.Return<
    typeof ChildModel.Type,
    typeof ChildMessage.Type,
    Command.HandlerOf<typeof ChildSave>
  > => ({
    model: modifyFields(model, { count: count => count + 1 }),
    commands: [ChildSave()],
  }),
  CompletedChildSave: (
    model,
  ): Update.Return<
    typeof ChildModel.Type,
    typeof ChildMessage.Type,
    Command.HandlerOf<typeof ChildSave>
  > => ({ model }),
})
const prepareChild = () =>
  ChildComposition.prepareBlock({
    init: () => ({ model: ChildModel.make({ count: 0 }) }),
    update: childUpdate,
    operations: {
      requestIncrement: ChildMessage.RequestedIncrement,
    },
    EffectsLayer: ChildSave.layer,
  })
const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChild
> = Block.assemble(prepareChild)

const ParentModel = Schema.Struct({ child: ChildModel })
const ParentMessage = defineMessageUnion({
  IgnoredRequest: {},
  RequestedChildIncrement: {},
  RequestedLocalSave: {},
  RequestedReport: {},
  CompletedLocalSave: {},
})
const ParentOutMessage = defineMessageUnion({ Reported: {} })
const ParentDefinition = makeDefinition('CompositionUpdateChannelsParent', {
  Model: ParentModel,
  Message: ParentMessage,
  OutMessage: ParentOutMessage,
})
const LocalSave = ParentDefinition.makeCommand('LocalSave', {
  messages: [ParentMessage.CompletedLocalSave],
  handler: function* () {
    return () => Effect.succeed(ParentMessage.CompletedLocalSave())
  },
})
const ChildBinding = ParentDefinition.makeBinding(ChildBlock, {
  field: 'child',
})
const ParentComposition = ParentDefinition.makeComposition({
  bindings: [ChildBinding],
})

const localNoopStep = ParentDefinition.makeNoopStep()
const saveLocallyStep = ParentDefinition.makeCommandsStep(() => [LocalSave()])
const reportStep = ParentDefinition.makeOutMessageStep(() =>
  ParentOutMessage.Reported(),
)

const update = ParentComposition.makeUpdate({
  IgnoredRequest: model => localNoopStep(model),
  RequestedChildIncrement: model => ChildBinding.requestIncrement()(model),
  RequestedLocalSave: model => saveLocallyStep(model),
  RequestedReport: model => reportStep(model),
  CompletedLocalSave: model => localNoopStep(model),
})

type UpdateOutMessage =
  ReturnType<typeof update> extends Readonly<{
    outMessage?: infer OutMessage
  }>
    ? Exclude<OutMessage, undefined>
    : never

it('retains owned local Steps and connected operations', () => {
  const model = ParentModel.make({ child: ChildModel.make({ count: 0 }) })
  const childResult = update(model, ParentMessage.RequestedChildIncrement())
  const localResult = update(model, ParentMessage.RequestedLocalSave())
  const reportResult = update(model, ParentMessage.RequestedReport())

  expect(childResult.model.child.count).toBe(1)
  expect(childResult.commands?.map(command => command.name)).toEqual([
    'child/ChildSave',
  ])
  expect(localResult.commands?.map(command => command.name)).toEqual([
    LocalSave.name,
  ])
  expect(reportResult.outMessage).toEqual(ParentOutMessage.Reported())
  expectTypeOf<UpdateOutMessage>().toEqualTypeOf<typeof ParentOutMessage.Type>()
  expectTypeOf<Update.RequirementsOf<typeof update>>().toEqualTypeOf<
    | Command.HandlerOf<typeof LocalSave>
    | Block.Scoped<'child', Command.HandlerOf<typeof ChildSave>>
  >()
  expectTypeOf<
    Update.RegistrationEvidenceOf<ReturnType<typeof update>>
  >().toEqualTypeOf<RequirementOfBinding<typeof ChildBinding>>()
})
