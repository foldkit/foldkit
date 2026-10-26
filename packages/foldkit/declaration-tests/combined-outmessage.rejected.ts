import { pipe } from 'effect'
import { Update } from 'foldkit'

import {
  EditorBlock,
  EditorComposition,
  EditorDefinition,
  ForwardingComposition,
  ForwardingEditorBinding,
  Message,
  OutMessage,
  ParentDefinition,
  ParentOutMessage,
  RememberClose,
  ReportComposition,
  ReportOutMessage,
  closeDialogStep,
  initialModel,
  plainStep,
  reportSteps,
  steps,
} from './combined-outmessage.accepted.js'

ReportComposition.makeUpdate({
  // @ts-expect-error A raw local branch cannot erase channels beside a connected branch in one handler.
  Saved: model =>
    model.count > 0
      ? pipe(
          Update.combineSteps(model, reportSteps),
          Update.withOutMessage(ReportOutMessage.Saved()),
        )
      : { model, outMessage: ReportOutMessage.Plain() },
  Plain: model => ({ model, outMessage: ReportOutMessage.Plain() }),
})

// @ts-expect-error A plain Model does not establish the connected Steps' Binding registration.
Update.combineSteps(initialModel, steps)
const unregisteredSaveStep = EditorDefinition.makeStep(() =>
  Update.combineSteps(steps),
)
EditorDefinition.makeComposition().makeUpdate({
  // @ts-expect-error Applying the owned Step also requires the missing Binding.
  SavedArray: model =>
    pipe(
      // @ts-expect-error The unregistered Model cannot supply the Step's graph capability.
      unregisteredSaveStep(model),
      Update.withOutMessage(OutMessage.Saved()),
    ),
  SavedTuple: model => ({ model }),
  SavedCurriedArray: model => ({ model }),
  SavedCurriedTuple: model => ({ model }),
  SavedNestedArray: model => ({ model }),
  SavedNestedTuple: model => ({ model }),
  Plain: model => ({ model }),
})

const StoreEditor = EditorDefinition.makeCommand('StoreEditor', {
  messages: [Message.Plain],
})
const storeEditorStep = EditorDefinition.makeCommandsStep(() => [StoreEditor()])
const updateWithoutHandler = EditorComposition.makeUpdate({
  SavedArray: model =>
    pipe(
      Update.combineSteps(model, [closeDialogStep, storeEditorStep]),
      Update.withOutMessage(OutMessage.Saved()),
    ),
  SavedTuple: model =>
    pipe(
      Update.combineSteps(model, [closeDialogStep, storeEditorStep]),
      Update.withOutMessage(OutMessage.Saved()),
    ),
  SavedCurriedArray: model =>
    pipe(
      Update.combineSteps(model, [closeDialogStep, storeEditorStep]),
      Update.withOutMessage(OutMessage.Saved()),
    ),
  SavedCurriedTuple: model =>
    pipe(
      Update.combineSteps(model, [closeDialogStep, storeEditorStep]),
      Update.withOutMessage(OutMessage.Saved()),
    ),
  SavedNestedArray: model =>
    pipe(
      Update.combineSteps(model, [closeDialogStep, storeEditorStep]),
      Update.withOutMessage(OutMessage.Saved()),
    ),
  SavedNestedTuple: model =>
    pipe(
      Update.combineSteps(model, [closeDialogStep, storeEditorStep]),
      Update.withOutMessage(OutMessage.Saved()),
    ),
  Plain: model =>
    pipe(
      Update.combineSteps(model, [closeDialogStep, storeEditorStep]),
      Update.withOutMessage(OutMessage.Saved()),
    ),
})
// @ts-expect-error Attaching an OutMessage preserves the combined Commands' missing handler.
EditorComposition.prepareBlock({
  init: EditorComposition.makeInit(() => ({ model: { count: 0 } })),
  update: updateWithoutHandler,
})

// @ts-expect-error Every emitted OutMessage remains mandatory in the parent's policy.
ParentDefinition.makeOutMessageFold(EditorBlock, {
  SavedTuple: ParentDefinition.makeNoopStep,
  SavedCurriedArray: ParentDefinition.makeNoopStep,
  SavedCurriedTuple: ParentDefinition.makeNoopStep,
  SavedNestedArray: ParentDefinition.makeNoopStep,
  SavedNestedTuple: ParentDefinition.makeNoopStep,
  Plain: ParentDefinition.makeNoopStep,
})

const forwardedSaveStep = ForwardingEditorBinding.save()
const forwardedSteps: ReadonlyArray<typeof forwardedSaveStep> = [
  forwardedSaveStep,
]
ForwardingComposition.makeUpdate({
  // @ts-expect-error Attaching an OutMessage cannot discard the registered child's policy OutMessage.
  RequestedSave: model =>
    pipe(
      Update.combineSteps(model, forwardedSteps),
      Update.withOutMessage(ParentOutMessage.ObservedSave()),
    ),
})
ForwardingComposition.makeUpdate({
  // @ts-expect-error A curried combination retains the same child policy obligation.
  RequestedSave: model =>
    pipe(
      Update.combineSteps(forwardedSteps)(model),
      Update.withOutMessage(ParentOutMessage.ObservedSave()),
    ),
})
ForwardingComposition.makeUpdate({
  // @ts-expect-error Nesting cannot erase the child's OutMessage policy.
  RequestedSave: model =>
    pipe(
      Update.combineSteps(model, [Update.combineSteps(forwardedSteps)]),
      Update.withOutMessage(ParentOutMessage.ObservedSave()),
    ),
})

// @ts-expect-error withOutMessage cannot replace an already emitted OutMessage.
Update.withOutMessage(plainStep(initialModel), OutMessage.Saved())
// @ts-expect-error A Command keeps its exact constructor payload.
RememberClose({ count: 'invalid' })
// @ts-expect-error A Command cannot omit its payload.
RememberClose()
