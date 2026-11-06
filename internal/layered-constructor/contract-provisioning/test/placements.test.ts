import { Effect } from 'effect'
import * as Story from 'foldkit/story'
import { expect, test } from 'vitest'

import { ChatRoomBlock } from '../src/chatRoom'
import { MessageComposerBinding } from '../src/chatRoom/composition'
import { ChatRoomContract } from '../src/chatRoom/definition'
import { MessageComposerBlock } from '../src/messageComposer'
import { Message as ComposerMessage } from '../src/messageComposer/message'
import { InlineChatRoomBlock, LocalChatRoomBlock } from '../src/placements'

test.each([
  { placement: 'extracted', block: ChatRoomBlock },
  { placement: 'constructor-local', block: LocalChatRoomBlock },
  { placement: 'inline', block: InlineChatRoomBlock },
])(
  'the $placement Binding/update builders retain deferred init and the public operation',
  async ({ block }) => {
    const provided = block.provide(MessageComposerBlock.layer)

    await Effect.runPromise(
      Effect.gen(function* () {
        const room = yield* ChatRoomContract.get
        const roomInit = room.init({
          title: 'General',
          inputId: 'placement-input',
        })
        const disconnected = room.operations.requestDisconnect(roomInit.model)

        expect(disconnected.model.title).toBe('General')
        expect(disconnected.model.messageComposer.id).toBe('placement-input')
        expect(disconnected.model.connection._tag).toBe('Disconnected')
      }).pipe(Effect.provide(provided.layer)),
    )
  },
)

test('the real extracted relationship remains available to independently authored parent Stories', () =>
  Effect.runPromise(
    Story.story(
      ChatRoomBlock.provide(MessageComposerBlock.layer),
      Story.init({ title: 'General', inputId: 'extracted-input' }),
      Story.messageIn(
        MessageComposerBinding,
        ComposerMessage.UpdatedText({ value: 'Hello' }),
      ),
      Story.model(model => expect(model.messageComposer.text).toBe('Hello')),
    ),
  ))
