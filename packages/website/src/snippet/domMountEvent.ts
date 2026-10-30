import { Effect, Schema } from 'effect'
import { Block, Dom, Mount } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Message = defineMessageUnion({
  MovedPointer: { clientX: Schema.Number, clientY: Schema.Number },
})

const TrackPointer = Mount.defineStream('TrackPointer', {
  messages: [Message.MovedPointer],
})

export class Panel extends Block<Panel>()('Panel', {
  Model: Schema.Struct({ clientX: Schema.Number, clientY: Schema.Number }),
  Message,
  Mount: [TrackPointer],
}) {}

export const PanelLive = Panel.make(
  Effect.fn(function* () {
    return {
      model: { clientX: 0, clientY: 0 },

      update: {
        MovedPointer: (model, { clientX, clientY }) => ({
          model: modifyFields(model, {
            clientX: () => clientX,
            clientY: () => clientY,
          }),
        }),
      },

      mounts: {
        TrackPointer: ({ element }) =>
          Dom.streamFromEvent({
            target: element,
            type: 'pointermove',
            mapEvent: event =>
              Message.MovedPointer({
                clientX: event.clientX,
                clientY: event.clientY,
              }),
          }),
      },

      view: (_model, h) => h.div([h.Class('h-48'), h.OnMount(TrackPointer())]),
    }
  }),
)
