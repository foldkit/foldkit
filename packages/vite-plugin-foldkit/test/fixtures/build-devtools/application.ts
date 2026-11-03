import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export const Model = Schema.Struct({ count: Schema.Number })
export type Model = typeof Model.Type

export const Message = defineMessageUnion({ ClickedIncrement: {} })
export type Message = typeof Message.Type

const ApplicationKey = Symbol('Application')
const ApplicationDefinition = Block.makeDefinition('Application', {
  key: ApplicationKey,
  Init: Schema.Tuple([]),
  view: { kind: 'Document' },
  Model,
  Message,
})
const ApplicationComposition = ApplicationDefinition.makeComposition()

const init = ApplicationComposition.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))

const update = ApplicationComposition.makeUpdate({
  ClickedIncrement: model => ({
    model: modifyFields(model, { count: count => count + 1 }),
  }),
})

const view = ApplicationComposition.makeView((model, h) => ({
  title: `Count ${model.count}`,
  body: h.main(
    [],
    [
      h.button(
        [h.Id('increment'), h.OnClick(Message.ClickedIncrement())],
        [`Count ${model.count}`],
      ),
    ],
  ),
}))

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
    }
  }),
)
