import { Effect, Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as Update from '../update/index.js'
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

const unsafeUpdate = ParentComposition.makeUpdate({
  IgnoredRequest: model => ({ model }),
  // @ts-expect-error A raw local branch cannot erase channels beside a connected branch in one handler.
  RequestedChildIncrement: model =>
    model.child.count > 0 ? ChildBinding.requestIncrement()(model) : { model },
  RequestedLocalSave: model => ({ model, commands: [LocalSave()] }),
  RequestedReport: model => ({
    model,
    outMessage: ParentOutMessage.Reported(),
  }),
  CompletedLocalSave: model => ({ model }),
})
void unsafeUpdate

const rawLocalOnly = ParentDefinition.makeComposition().makeUpdate({
  IgnoredRequest: model => ({ model }),
  RequestedChildIncrement: model => ({ model }),
  RequestedLocalSave: model => ({ model, commands: [LocalSave()] }),
  RequestedReport: model => ({
    model,
    outMessage: ParentOutMessage.Reported(),
  }),
  CompletedLocalSave: model => ({ model }),
})

it('keeps raw results available for updates without connected operations', () => {
  const model = ParentModel.make({ child: ChildModel.make({ count: 0 }) })
  const saveResult = rawLocalOnly(model, ParentMessage.RequestedLocalSave())
  const reportResult = rawLocalOnly(model, ParentMessage.RequestedReport())

  expect(saveResult.model).toBe(model)
  expect(saveResult.commands?.map(command => command.name)).toEqual([
    LocalSave.name,
  ])
  expect(reportResult.model).toBe(model)
  expect(reportResult.outMessage).toEqual(ParentOutMessage.Reported())
  expectTypeOf<Update.RequirementsOf<typeof rawLocalOnly>>().toEqualTypeOf<
    Command.HandlerOf<typeof LocalSave>
  >()
  expectTypeOf<
    NonNullable<ReturnType<typeof rawLocalOnly>['outMessage']>
  >().toEqualTypeOf<typeof ParentOutMessage.Type>()
})
