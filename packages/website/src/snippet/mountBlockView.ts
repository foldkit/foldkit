import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ label: Schema.String })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  CompletedMeasurePanel: { height: Schema.Number },
})
type Message = typeof Message.Type

const PanelKey = Symbol('Panel')

const PanelDefinition = Block.makeDefinition('Panel', {
  key: PanelKey,
  Init: Schema.Tuple([]),
  view: { kind: 'Element' },
  Model,
  Message,
})

const { makeNoopStep } = PanelDefinition

const MeasurePanel = PanelDefinition.makeMount('MeasurePanel', {
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

const PanelComposition = PanelDefinition.makeComposition({
  mounts: [MeasurePanel],
})
type PanelViewBuilder = Block.ViewBuilderFor<typeof PanelComposition>

const panelView = <Builder extends PanelViewBuilder>(
  model: Model,
  h: Builder,
) => h.div([h.OnMount(MeasurePanel())], [model.label])

const init = PanelComposition.makeInit(() => ({
  model: Model.make({ label: 'PanelDefinition' }),
}))
const update = PanelComposition.makeUpdate({
  CompletedMeasurePanel: makeNoopStep(),
})
const view = PanelComposition.makeView((model, h) => panelView(model, h))

export const PanelBlock = PanelDefinition.contract

export const layer = PanelDefinition.makeBlock(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
      EffectsLayer: MeasurePanel.layer,
    }
  }),
).layer
