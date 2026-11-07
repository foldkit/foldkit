import { Effect, Schema } from 'effect'
import * as Block from 'foldkit/block'
import * as Update from 'foldkit/update'

import { ApplicationComposition, makeInMessageUpdate } from './composition.js'
import {
  ApplicationBlock,
  InMessage,
  Message,
  Model,
  OutMessage,
  makeCommandsStep,
} from './definition.js'
import { EditorBlock } from './editor.js'
import { focused } from './update.js'

const InputOnlyKey = Symbol('InputOnly')
const InputOnlyBlock = Block.make('InputOnly', {
  key: InputOnlyKey,
  Model,
  Message: InMessage,
  InitArgs: Schema.Tuple([]),
})
const SendInput = InputOnlyBlock.makeCommand('SendInput', {
  messages: [InMessage.RequestedSet],
})

if (false) {
  // @ts-expect-error The input record must cover every InMessage.
  makeInMessageUpdate({ RequestedSet: model => ({ model }) })
  // @ts-expect-error Local Message tags never join input selectors.
  makeInMessageUpdate.on(['ClickedIncrement'])
  // @ts-expect-error Shared input pieces cannot emit an OutMessage.
  makeInMessageUpdate.each(model => ({
    model,
    outMessage: OutMessage.Submitted({ text: '' }),
  }))
  // @ts-expect-error Input Commands still return local Messages.
  makeCommandsStep(() => [SendInput()])
  makeInMessageUpdate.cases({
    RequestedSubmit: ApplicationBlock.makeFieldsStep((_model, input) => ({
      // @ts-expect-error This exact input has text, not value.
      count: () => input.value,
    })),
  })
  makeInMessageUpdate.compose(
    // @ts-expect-error A second record emitter cannot overwrite an existing OutMessage.
    makeInMessageUpdate({
      RequestedSet: model => ({ model }),
      RequestedSave: model => ({ model }),
      RequestedSubmit: model => ({
        model,
        outMessage: OutMessage.Submitted({ text: '' }),
      }),
    }),
    makeInMessageUpdate.cases({
      RequestedSubmit: model => ({
        model,
        outMessage: OutMessage.Submitted({ text: '' }),
      }),
    }),
  )
  makeInMessageUpdate.compose(
    // @ts-expect-error Local update plans are a different entry kind.
    ApplicationComposition.makeUpdate({
      ClickedIncrement: model => ({ model }),
      SubmittedForm: model => ({ model }),
      CompletedSaveDraft: model => ({ model }),
    }),
  )
  // @ts-expect-error Focused-only bundles cannot complete an input entry point.
  ApplicationBlock.makeLayer(
    Effect.succeed({
      children: [],
      init: ApplicationComposition.makeInit(() => ({
        model: { count: 0, snapshots: [], seen: [] },
      })),
      update: ApplicationComposition.makeUpdate({
        ClickedIncrement: model => ({ model }),
        SubmittedForm: model => ({ model }),
        CompletedSaveDraft: model => ({ model }),
      }),
      inMessageUpdate: focused,
    }),
  )
}

const UnregisteredBinding = ApplicationBlock.makeRequiredFieldBinding(
  EditorBlock,
  {
    field: 'editor',
    placement: 'unregistered',
  },
).withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(EditorBlock, {
    Edited: () => Update.defineStep((model: Model) => ({ model })),
  }),
})
if (false) {
  makeInMessageUpdate.cases({
    // @ts-expect-error Connected operations must belong to this exact graph.
    RequestedSet: UnregisteredBinding.informOfTextChange({ text: '' }),
  })
}

export function inspect(
  app: Block.ExecutableOf<typeof ApplicationBlock>,
  model: Model,
) {
  const silent = app.inMessageUpdate(
    model,
    InMessage.RequestedSet({ value: 1 }),
  )
  const emitted = app.inMessageUpdate(
    InMessage.RequestedSubmit({ text: 'exact' }),
  )(model)
  const noOut: undefined = silent.outMessage
  const out: typeof OutMessage.Submitted.Type | undefined = emitted.outMessage
  // @ts-expect-error The old acquired input entry is removed.
  app.receive(model, InMessage.RequestedSet({ value: 1 }))
  // @ts-expect-error Local Messages cannot be received as InMessages.
  app.inMessageUpdate(model, Message.ClickedIncrement())
  return { noOut, out }
}

const ForeignKey = Symbol('ForeignInput')
const ForeignInputBlock = Block.make('ForeignInput', {
  key: ForeignKey,
  Model,
  Message,
  InMessage,
  InitArgs: Schema.Tuple([]),
})
const foreignBundle =
  ForeignInputBlock.makeComposition().makeInMessageUpdate.each(model => ({
    model,
  }))
const wrongModelStep = Update.defineStep(
  (model: typeof EditorBlock.Model.Type) => ({ model }),
)
if (false) {
  // @ts-expect-error Reusable bundles retain their original Composition owner.
  makeInMessageUpdate.compose(foreignBundle)
  // @ts-expect-error Shared Steps must evolve this entry point's Model.
  makeInMessageUpdate.each(() => wrongModelStep)
}

const EmittingBinding = ApplicationBlock.makeRequiredFieldBinding(EditorBlock, {
  field: 'editor',
  placement: 'emitting',
}).withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(EditorBlock, {
    Edited: () =>
      ApplicationBlock.makeOutMessageStep(() =>
        OutMessage.Submitted({ text: 'child' }),
      ),
  }),
})
const EmittingComposition = ApplicationBlock.makeComposition({
  bindings: [EmittingBinding],
})
if (false) {
  // @ts-expect-error A shared connected operation cannot hide a child-derived OutMessage.
  EmittingComposition.makeInMessageUpdate.each(() =>
    EmittingBinding.informOfTextChange({ text: 'child' }),
  )
}

if (false) {
  // @ts-expect-error The old input builder is removed.
  ApplicationComposition.makeReceive({})
}
