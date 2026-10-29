import { Schema } from 'effect'
import { Block, Dom } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  MovedPointer: { clientX: Schema.Number, clientY: Schema.Number },
})
type Message = typeof Message.Type

const Model = Schema.Struct({})
type Model = typeof Model.Type

const PanelDefinition = Block.makeDefinition('Panel', { Model, Message })

const TrackPointer = PanelDefinition.makeMountStream('TrackPointer', {
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

const PanelComposition = PanelDefinition.makeComposition({
  mounts: [TrackPointer],
})

const view = PanelComposition.makeView((_model, h) =>
  h.div([h.Class('h-48'), h.OnMount(TrackPointer())]),
)

export const EffectsLayer = TrackPointer.layer
