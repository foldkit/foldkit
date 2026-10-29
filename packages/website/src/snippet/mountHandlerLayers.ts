import { Effect, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ panelHeight: Schema.Option(Schema.Number) })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  CompletedMeasurePanel: { height: Schema.Number },
})
type Message = typeof Message.Type

const PanelDefinition = Block.makeDefinition('Panel', { Model, Message })

const { makeFieldsStep } = PanelDefinition

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

const update = PanelComposition.makeUpdate({
  CompletedMeasurePanel: makeFieldsStep.fromMessage(({ height }) => ({
    panelHeight: () => Option.some(height),
  })),
})

const view = PanelComposition.makeView((model, h) => ({
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
}))

const init = PanelComposition.makeInit(() => ({
  model: Model.make({ panelHeight: Option.none() }),
}))

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
