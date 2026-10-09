import { Effect, Option, Schema } from 'effect'
import { Application, Mount, Runtime } from 'foldkit'
import type { Document, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Model = Schema.Struct({ panelHeight: Schema.Option(Schema.Number) })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  CompletedMeasurePanel: { height: Schema.Number },
})
type Message = typeof Message.Type

const MeasurePanel = Mount.define('MeasurePanel', {
  messages: [Message.CompletedMeasurePanel],
})

const MeasurePanelLayer = MeasurePanel.toLayer(({ element }) =>
  Effect.sync(() =>
    Message.CompletedMeasurePanel({
      height: element.getBoundingClientRect().height,
    }),
  ),
)

const init = () => ({ model: Model.make({ panelHeight: Option.none() }) })

const update = (model: Model, message: Message) =>
  Message.match(message, {
    CompletedMeasurePanel: ({ height }) => ({
      model: modifyFields(model, {
        panelHeight: () => Option.some(height),
      }),
    }),
  })

const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Measured panel',
  body: h.div(
    [h.OnMount(MeasurePanel())],
    [
      Option.match(model.panelHeight, {
        onNone: () => 'Measuring',
        onSome: height => `Height: ${height}`,
      }),
    ],
  ),
})

const application = Application.make({
  Model,
  init,
  update,
  view,
  mounts: [MeasurePanel],
  container: document.getElementById('root'),
})

Runtime.run(Application.provide(application, MeasurePanelLayer))
