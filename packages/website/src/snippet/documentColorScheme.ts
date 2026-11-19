import { Schema } from 'effect'
import { ColorScheme, type Document, type HtmlBuilder } from 'foldkit/html'

// MODEL

const Model = Schema.Struct({
  colorScheme: ColorScheme,
})
type Model = typeof Model.Type

// VIEW

const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Settings',
  colorScheme: model.colorScheme,
  body: h.div(
    [h.Class('mx-auto max-w-prose p-6')],
    [colorSchemePicker(model.colorScheme, h)],
  ),
})
