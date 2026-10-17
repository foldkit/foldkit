import { Array, Schema, Tuple } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { VirtualList } from '@foldkit/ui'
import { ScrollTarget as VirtualListScrollTarget } from '@foldkit/ui/virtualList'

const ChatMessage = Schema.Struct({ id: Schema.String, body: Schema.String })
type ChatMessage = typeof ChatMessage.Type

const MessageList = VirtualList.create<ChatMessage>()

const Model = Schema.Struct({
  messages: Schema.Array(ChatMessage),
  messageList: MessageList.Model,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  GotMessageListMessage: { message: MessageList.Message },
  ReceivedMessage: { message: ChatMessage },
})
type Message = typeof Message.Type

const initialMessages: ReadonlyArray<typeof ChatMessage.Type> = []

const MessageListExample = Block.define('MessageListExample', {
  Model,
  Message,
})

const MessageListBinding = MessageListExample.bindChild(MessageList, {
  field: 'messageList',
  parentMessage: Message.GotMessageListMessage,
  init: {
    args: () =>
      Tuple.make({
        id: 'message-list',
        rowHeightPx: 64,
        initialScroll: { target: VirtualListScrollTarget.End() },
        followEnd: { thresholdPx: 8 },
      }),
  },
})

const MessageListExampleComposition = MessageListExample.makeComposition({
  childBindings: [MessageListBinding],
})

const init = MessageListExampleComposition.makeInit(() => ({
  model: {
    messages: initialMessages,
  },
}))

const update = MessageListExampleComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ReceivedMessage: ({ message }) => {
      const nextMessages = Array.append(model.messages, message)
      const nextModel = modifyFields(model, {
        messages: () => nextMessages,
      })
      return MessageListBinding.informItemsChanged(
        Array.map(nextMessages, message => String(message.id)),
      )(nextModel)
    },
  }),
)

const view = MessageListExampleComposition.makeView((model, h) =>
  h.block(
    MessageListBinding.embedView({
      slotId: 'message-list',
      model: model.messageList,
      viewInputs: {
        items: model.messages,
        itemToKey: message => String(message.id),
        itemToView: message =>
          h.div([h.Class('rounded-xl px-3 py-2')], [message.body]),
        dynamicRowHeights: true,
        itemToEstimatedRowHeightPx: message =>
          message.body.length > 120 ? 96 : 64,
        contentAlignment: 'End',
        containerClassName: 'h-96 overflow-auto',
      },
    }),
  ),
)
