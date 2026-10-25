import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ label: Schema.String })
const Message = defineMessageUnion({
  CompletedMeasurePanel: { height: Schema.Number },
})

const PanelDefinition = Block.makeDefinition('Panel', { Model, Message })

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
  model: typeof Model.Type,
  h: Builder,
) => h.div([h.OnMount(MeasurePanel())], [model.label])

const init = PanelComposition.makeInit(() => ({
  model: Model.make({ label: 'PanelDefinition' }),
}))
const update = PanelComposition.makeUpdate({
  CompletedMeasurePanel: PanelDefinition.makeNoopStep(),
})
const view = PanelComposition.makeView((model, h) => panelView(model, h))

const prepare = () =>
  PanelComposition.prepareBlock({
    init,
    update,
    view,
    EffectsLayer: MeasurePanel.layer,
  })
export const PanelBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
