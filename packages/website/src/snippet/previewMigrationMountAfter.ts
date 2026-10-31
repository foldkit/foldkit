import { Effect, Schema } from 'effect'
import { Block, Mount } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Message = defineMessageUnion({
  CompletedMeasurePanel: { height: Schema.Number },
})

export const MeasurePanel = Mount.define('MeasurePanel', {
  messages: [Message.CompletedMeasurePanel],
})

export class Panel extends Block<Panel>()('Panel', {
  Model: Schema.Struct({ height: Schema.Number }),
  Message,
  Mount: [MeasurePanel],
}) {}

export const PanelLive = Panel.make(
  Effect.fn(function* () {
    return {
      model: { height: 0 },

      update: {
        CompletedMeasurePanel: (model, { height }) => ({
          model: modifyFields(model, { height: () => height }),
        }),
      },

      mounts: {
        MeasurePanel: ({ element }) =>
          Effect.sync(() =>
            Message.CompletedMeasurePanel({
              height: element.getBoundingClientRect().height,
            }),
          ),
      },

      view: (model, h) =>
        h.section([h.OnMount(MeasurePanel())], [`${model.height}px tall`]),
    }
  }),
)
