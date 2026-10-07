import { Schema } from 'effect'
import { Dom, Mount } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  MovedPointer: { clientX: Schema.Number, clientY: Schema.Number },
})
type Message = typeof Message.Type

const TrackPointer = Mount.defineStream('TrackPointer', {
  messages: [Message.MovedPointer],
  execute: ({ element }) =>
    Dom.streamFromEvent({
      target: element,
      type: 'pointermove',
      mapEvent: event =>
        Message.MovedPointer({
          clientX: event.clientX,
          clientY: event.clientY,
        }),
    }),
})

const panelView = (h: HtmlBuilder<Message>): Html =>
  h.div([h.Class('h-48'), h.OnMount(TrackPointer())])
