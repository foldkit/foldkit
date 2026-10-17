import { Schema } from 'effect'
import { Block, Dom } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  MovedPointer: { clientX: Schema.Number, clientY: Schema.Number },
})
const Model = Schema.Struct({})
const Panel = Block.define('Panel', { Model, Message })

const TrackPointer = Panel.mountStream('TrackPointer', {
  messages: [Message.MovedPointer],
  handler: function* () {
    return ({ element }) =>
      Dom.streamFromEvent({
        target: element,
        type: 'pointermove',
        mapEvent: event =>
          Message.MovedPointer({
            clientX: event.clientX,
            clientY: event.clientY,
          }),
      })
  },
})

const PanelComposition = Panel.makeComposition({
  mounts: [TrackPointer],
})

const view = PanelComposition.makeView((_model, h) =>
  h.div([h.Class('h-48'), h.OnMount(TrackPointer())]),
)

export const EffectsLayer = TrackPointer.layer
