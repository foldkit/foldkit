import { Array, Option } from 'effect'
import { Update } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { modifyFields } from 'foldkit/struct'

import { VirtualList } from '@foldkit/ui'

// INIT

const init = () => ({
  model: {
    messages: initialMessages,
    messageList: VirtualList.init({
      id: 'message-list',
      rowHeightPx: 64,
      initialScroll: { target: VirtualList.ScrollTarget.End() },
      followEnd: { thresholdPx: 8 },
    }),
  },
})

// UPDATE

const foldMessageList = Update.foldChild({
  update: VirtualList.update,
  read: (model: Model) => Option.some(model.messageList),
  write: (model, nextMessageList) =>
    modifyFields(model, { messageList: () => nextMessageList }),
  toParentMessage: message => Message.GotMessageListMessage({ message }),
})

const foldMessageListItemsChanged = Update.foldChild({
  update: VirtualList.informItemsChanged,
  read: (model: Model) => Option.some(model.messageList),
  write: (model, nextMessageList) =>
    modifyFields(model, { messageList: () => nextMessageList }),
  toParentMessage: message => Message.GotMessageListMessage({ message }),
})

GotMessageListMessage: ({ message }) => foldMessageList(model, message)

ReceivedMessage: ({ message }) => {
  const nextMessages = Array.append(model.messages, message)
  const nextModel = modifyFields(model, {
    messages: () => nextMessages,
  })
  return foldMessageListItemsChanged(
    nextModel,
    Array.map(nextMessages, message => String(message.id)),
  )
}

// VIEW

const view = (model: Model, h: HtmlBuilder<Message>) =>
  h.submodel({
    slotId: 'message-list',
    model: model.messageList,
    view: VirtualList.view<ChatMessage>(),
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
    toParentMessage: message => Message.GotMessageListMessage({ message }),
  })
