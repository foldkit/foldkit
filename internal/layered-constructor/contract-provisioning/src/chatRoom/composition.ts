import type * as Block from 'foldkit/block'

import { MessageComposerContract } from '../messageComposer/definition'
import { SendMessage } from './command'
import {
  makeBinding,
  makeCommandsStep,
  makeComposition,
  makeOutMessageFold,
} from './definition'

export const MessageComposerBinding = makeBinding(MessageComposerContract, {
  field: 'messageComposer',
  init: { contextToArgs: ({ inputId }) => [inputId] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(MessageComposerContract, {
    Submitted: ({ text }) => makeCommandsStep(() => [SendMessage({ text })]),
  }),
})

export const ChatRoomComposition = makeComposition({
  bindings: [MessageComposerBinding],
})
export type ChatRoomViewBuilder = Block.ViewBuilderFor<
  typeof ChatRoomComposition
>
