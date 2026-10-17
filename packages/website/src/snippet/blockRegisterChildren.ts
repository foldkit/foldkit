import * as Composer from './composer'
import { Chat } from './definition'
import { Message } from './message'

export const PrimaryComposerBinding = Chat.bindChild(Composer.block, {
  field: 'primaryComposer',
  parentMessage: Message.GotPrimaryComposerMessage,
})

export const SecondaryComposerBinding = Chat.bindChild(Composer.block, {
  field: 'secondaryComposer',
  parentMessage: Message.GotSecondaryComposerMessage,
})

export const ChatComposition = Chat.makeComposition({
  childBindings: [PrimaryComposerBinding, SecondaryComposerBinding],
})
