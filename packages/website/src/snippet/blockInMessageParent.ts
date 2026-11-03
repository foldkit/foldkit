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
const ConversationKey = Symbol('Conversation')
const ConversationDefinition = Block.makeDefinition('Conversation', {
  key: ConversationKey,
  Model,
  Message,
  Init: Schema.Tuple([]),
})

export const ComposerBinding = ConversationDefinition.makeBinding(
  MessageComposerBlock,
  {
    field: 'composer',
    init: { contextToArgs: () => ['message'] },
  },
).withOutMessagePolicy({
  fold: ConversationDefinition.makeOutMessageFold(MessageComposerBlock, {
    Submitted: ({ text }) =>
      ConversationDefinition.makeFieldsStep(() => ({
        maybeSubmittedText: () => Option.some(text),
      })),
  }),
})
const ConversationComposition = ConversationDefinition.makeComposition({
  bindings: [ComposerBinding],
})

export const update = ConversationComposition.makeUpdate({
  ClickedSend: ComposerBinding.requestSubmit(),
  ChangedDraft: ConversationDefinition.makeStep.fromMessage(({ text }) =>
    ComposerBinding.informDraftChanged({ text }),
  ),
})
