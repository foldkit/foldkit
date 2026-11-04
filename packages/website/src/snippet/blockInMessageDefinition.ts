import { Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'

export const Model = Schema.Struct({ id: Schema.String, text: Schema.String })
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  UpdatedText: { value: Schema.String },
  SubmittedForm: {},
})
export type Message = typeof Message.Type

export const InMessage = defineMessageUnion({
  RequestedSubmit: {},
  RequestedClear: {},
  InformedOfDraftChanged: { text: Schema.String },
})
export type InMessage = typeof InMessage.Type

export const OutMessage = defineMessageUnion({
  Submitted: { text: Schema.String },
})
export type OutMessage = typeof OutMessage.Type

export const MessageComposerKey = Symbol('MessageComposer')

export const MessageComposerBlock = Block.make('MessageComposer', {
  key: MessageComposerKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  Init: Schema.Tuple([Schema.String]),
  view: { kind: 'Element' },
  inMessageOutputs: {
    RequestedSubmit: { outMessage: OutMessage.Submitted },
  },
})

export const { makeFieldsStep, makeStep } = MessageComposerBlock
export const MessageComposerComposition = MessageComposerBlock.makeComposition()
