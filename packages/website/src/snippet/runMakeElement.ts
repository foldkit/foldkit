import { Effect, Number, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

class Widget extends Block<Widget>()('Widget', {
  Model: Schema.Struct({ likes: Schema.Number }),
  Message: defineMessageUnion({ ClickedLike: {} }),
}) {}

const WidgetLive = Widget.make(
  Effect.fn(function* () {
    return {
      model: { likes: 0 },

      update: {
        ClickedLike: model => ({
          model: modifyFields(model, { likes: Number.increment }),
        }),
      },

      view: (model, h) =>
        h.button(
          [h.OnClick(Widget.Message.ClickedLike())],
          [`Like (${model.likes})`],
        ),
    }
  }),
)

const element = Program.makeElement(Widget, {
  layer: WidgetLive,
  container: document.getElementById('widget'),
})

Runtime.run(element)
