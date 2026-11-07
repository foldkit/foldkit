import { Option, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'

import { MessageComposerBlock } from './blockInMessageDefinition'

export const Model = Schema.Struct({
  composer: MessageComposerBlock.Model,
  maybeSubmittedText: Schema.Option(Schema.String),
})
export type Model = typeof Model.Type
export const Message = defineMessageUnion({
  ClickedSend: {},
  ChangedDraft: { text: Schema.String },
})
export type Message = typeof Message.Type
export const ConversationKey = Symbol('Conversation')
const ConversationBlock = Block.make('Conversation', {
  key: ConversationKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
})

const {
  makeRequiredFieldBinding,
  makeOutMessageFold,
  makeFieldsStep,
  makeComposition,
  makeStep,
} = ConversationBlock

export const ComposerBinding = makeRequiredFieldBinding(MessageComposerBlock, {
  field: 'composer',
  init: { contextToArgs: () => ['message'] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(MessageComposerBlock, {
    Submitted: ({ text }) =>
      makeFieldsStep(() => ({
        maybeSubmittedText: () => Option.some(text),
      })),
  }),
})
const ConversationComposition = makeComposition({
  bindings: [ComposerBinding],
})

export const update = ConversationComposition.makeUpdate({
  ClickedSend: ComposerBinding.requestSubmit(),
  ChangedDraft: makeStep.fromMessage(({ text }) =>
    ComposerBinding.informOfDraftChanged({ text }),
  ),
})
