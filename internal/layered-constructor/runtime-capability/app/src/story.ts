import { Effect } from 'effect'
import * as Story from 'foldkit/story'

import { MessageComposerBinding } from './chatRoom/composition'
import { Message } from './chatRoom/message'
import { Message as ComposerMessage } from './messageComposer/message'
import { ChatRoomWithComposerBlock } from './provided'

export const pureStory = Story.story(
  ChatRoomWithComposerBlock,
  Story.init({ title: 'General', inputId: 'general' }),
  Story.message(Message.ConnectedChatSocket()),
  Story.messageIn(
    MessageComposerBinding,
    ComposerMessage.UpdatedText({ value: 'Pure draft' }),
  ),
)
type Expect<Value extends true> = Value
export type NoHandlerMocks = Expect<
  [Effect.Services<typeof pureStory>] extends [never] ? true : false
>
