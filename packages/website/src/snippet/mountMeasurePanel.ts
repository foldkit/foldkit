import { Effect, Option, Schema } from 'effect'
import { Block, Mount } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Message = defineMessageUnion({
  CompletedMeasurePanel: { height: Schema.Number },
})
type Message = typeof Message.Type

export const MeasurePanel = Mount.define('MeasurePanel', {
  messages: [Message.CompletedMeasurePanel],
})

const Model = Schema.Struct({ maybePanelHeight: Schema.Option(Schema.Number) })
type Model = typeof Model.Type

export class Panel extends Block<Panel>()('Panel', {
  Model,
  Message,
  Mount: [MeasurePanel],
}) {}

type PanelViewBuilder = HtmlBuilder<
  Message,
  Mount.RequirementsOf<typeof MeasurePanel>
>

const panelView = (model: Model, h: PanelViewBuilder): Html =>
  h.div(
    [h.OnMount(MeasurePanel())],
    [
      Option.match(model.maybePanelHeight, {
        onNone: () => 'Measuring',
        onSome: height => `Height: ${height}`,
      }),
    ],
  )

export const PanelLive = Panel.make(
  Effect.fn(function* () {
    return {
      model: { maybePanelHeight: Option.none() },

      update: {
        CompletedMeasurePanel: (model, { height }) => ({
          model: modifyFields(model, {
            maybePanelHeight: () => Option.some(height),
          }),
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

      view: panelView,
    }
  }),
)
