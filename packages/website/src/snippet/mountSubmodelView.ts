import { Effect, Schema } from 'effect'
import { Mount, Submodel } from 'foldkit'
import type { HtmlBuilder as FoldkitHtmlBuilder, Html } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ label: Schema.String })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  CompletedMeasurePanel: { height: Schema.Number },
})
type Message = typeof Message.Type

const MeasurePanel = Mount.define('MeasurePanel', {
  messages: [Message.CompletedMeasurePanel],
  handler: function* () {
    return ({ element }) =>
      Effect.sync(() =>
        Message.CompletedMeasurePanel({
          height: element.getBoundingClientRect().height,
        }),
      )
  },
})

export const mounts = [MeasurePanel]
export const EffectsLayer = MeasurePanel.layer

type MountRequirements = Mount.RequirementsOf<typeof mounts>

export type HtmlBuilder = FoldkitHtmlBuilder<Message, MountRequirements>

const panelView = (model: Model, h: HtmlBuilder): Html =>
  h.div([h.OnMount(MeasurePanel())], [model.label])

export const view = Submodel.defineView((model: Model, h: HtmlBuilder) =>
  panelView(model, h),
)
