import { Effect, Number, Schema, pipe } from 'effect'
import { expect, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import * as Story from '../test/story.js'
import * as Update from '../update/public.js'
import * as Block from './public.js'

const DialogModel = Schema.Struct({ count: Schema.Number })
const DialogMessage = defineMessageUnion({
  RequestedClose: {},
  CompletedRememberClose: {},
})
const DialogDefinition = Block.makeDefinition('CombinedOutMessageDialog', {
  Model: DialogModel,
  Message: DialogMessage,
})
const RememberClose = DialogDefinition.makeCommand('RememberClose', {
  args: { count: Schema.Number },
  messages: [DialogMessage.CompletedRememberClose],
  handler: function* () {
    return () => Effect.succeed(DialogMessage.CompletedRememberClose())
  },
})
const DialogComposition = DialogDefinition.makeComposition()
const prepareDialog = () =>
  DialogComposition.prepareBlock({
    init: DialogComposition.makeInit(() => ({ model: { count: 0 } })),
    update: DialogComposition.makeUpdate({
      RequestedClose: model =>
        Update.combineSteps(model, [
          DialogDefinition.makeFieldsStep(() => ({ count: Number.increment })),
          DialogDefinition.makeCommandsStep(({ count }) => [
            RememberClose({ count }),
          ]),
        ]),
      CompletedRememberClose: DialogDefinition.makeNoopStep(),
    }),
    operations: { requestClose: DialogMessage.RequestedClose },
    EffectsLayer: RememberClose.layer,
  })
const DialogBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof DialogModel,
  typeof prepareDialog
> = Block.assemble(prepareDialog)

const EditorModel = Schema.Struct({
  dialog: DialogBlock.Model,
  count: Schema.Number,
})
const EditorMessage = defineMessageUnion({
  RequestedSave: {},
  RequestedNestedSave: {},
  RequestedPlain: {},
})
const EditorOutMessage = defineMessageUnion({ Saved: {}, Plain: {} })
const EditorDefinition = Block.makeDefinition('CombinedOutMessageEditor', {
  Model: EditorModel,
  Message: EditorMessage,
  OutMessage: EditorOutMessage,
})
const DialogBinding = EditorDefinition.makeBinding(DialogBlock, {
  field: 'dialog',
})
const EditorComposition = EditorDefinition.makeComposition({
  bindings: [DialogBinding],
})
const closeDialogStep = DialogBinding.requestClose()
const steps: ReadonlyArray<typeof closeDialogStep> = [
  closeDialogStep,
  closeDialogStep,
]
const leaveStep = EditorDefinition.makeFieldsStep(() => ({
  count: Number.increment,
}))
const update = EditorComposition.makeUpdate({
  RequestedSave: model =>
    pipe(
      Update.combineSteps(model, steps),
      Update.withOutMessage(EditorOutMessage.Saved()),
    ),
  RequestedNestedSave: model =>
    pipe(
      Update.combineSteps(model, [
        leaveStep,
        Update.combineSteps(steps),
        leaveStep,
      ]),
      Update.withOutMessage(EditorOutMessage.Saved()),
    ),
  RequestedPlain: EditorDefinition.makeOutMessageStep(() =>
    EditorOutMessage.Plain(),
  ),
})
const prepareEditor = () =>
  EditorComposition.prepareBlock({
    init: EditorComposition.makeInit(() => ({ model: { count: 0 } })),
    update,
    operations: { save: EditorMessage.RequestedNestedSave },
  })
const EditorBlock: Block.FromAssemblyWithOutMessage<
  typeof EditorModel,
  typeof prepareEditor
> = Block.assemble(prepareEditor)
const initialModel = EditorModel.make({ dialog: { count: 0 }, count: 0 })

it('attaches OutMessages after applying sequential array and nested Steps', () => {
  const saved = update(initialModel, EditorMessage.RequestedSave())
  const nestedSaved = update(initialModel, EditorMessage.RequestedNestedSave())

  expect(saved.model).toEqual({ dialog: { count: 2 }, count: 0 })
  expect(nestedSaved.model).toEqual({ dialog: { count: 2 }, count: 2 })
  expect(saved.outMessage).toEqual(EditorOutMessage.Saved())
  expect(nestedSaved.outMessage).toEqual(EditorOutMessage.Saved())
  expect(saved.commands?.map(({ name, args }) => ({ name, args }))).toEqual([
    { name: 'dialog/RememberClose', args: { count: 1 } },
    { name: 'dialog/RememberClose', args: { count: 2 } },
  ])
  expect(
    nestedSaved.commands?.map(({ name, args }) => ({ name, args })),
  ).toEqual(saved.commands?.map(({ name, args }) => ({ name, args })))

  Story.story(
    update,
    Story.given(initialModel),
    Story.message(EditorMessage.RequestedSave()),
    Story.expectOutMessage(EditorOutMessage.Saved()),
    Story.Command.resolveAll(
      [RememberClose({ count: 1 }), DialogMessage.CompletedRememberClose()],
      [RememberClose({ count: 2 }), DialogMessage.CompletedRememberClose()],
    ),
    Story.message(EditorMessage.RequestedPlain()),
    Story.expectOutMessage(EditorOutMessage.Plain()),
  )
})

it('runs the parent OutMessage policy after the nested combination', () => {
  const ParentModel = Schema.Struct({
    editor: EditorBlock.Model,
    count: Schema.Number,
  })
  const ParentMessage = defineMessageUnion({ RequestedSave: {} })
  const ParentDefinition = Block.makeDefinition('CombinedOutMessageParent', {
    Model: ParentModel,
    Message: ParentMessage,
  })
  const EditorBinding = ParentDefinition.makeBinding(EditorBlock, {
    field: 'editor',
  }).withOutMessagePolicy({
    fold: ParentDefinition.makeOutMessageFold(EditorBlock, {
      Saved: () =>
        ParentDefinition.makeFieldsStep(() => ({ count: Number.increment })),
      Plain: ParentDefinition.makeNoopStep,
    }),
  })
  const ParentComposition = ParentDefinition.makeComposition({
    bindings: [EditorBinding],
  })
  const parentUpdate = ParentComposition.makeUpdate({
    RequestedSave: model => EditorBinding.save()(model),
  })
  const saved = parentUpdate(
    ParentModel.make({ editor: initialModel, count: 0 }),
    ParentMessage.RequestedSave(),
  )

  expect(saved.model).toEqual({
    editor: { dialog: { count: 2 }, count: 2 },
    count: 1,
  })
  expect(saved.outMessage).toBeUndefined()
  expect(saved.commands?.map(({ name, args }) => ({ name, args }))).toEqual([
    { name: 'editor/dialog/RememberClose', args: { count: 1 } },
    { name: 'editor/dialog/RememberClose', args: { count: 2 } },
  ])
})
