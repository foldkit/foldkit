import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export const Model = Schema.Struct({ count: Schema.Number })

export const Message = defineMessageUnion({})

export const ApplicationComposition = Block.makeDefinition('Application', {
  Model,
  Message,
}).makeComposition()

export const init = ApplicationComposition.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))

export const update = ApplicationComposition.makeUpdate({})

export const view = ApplicationComposition.makeView((model, h) => ({
  title: 'Client only',
  body: h.main([], [model.count.toString()]),
}))

const prepare = () =>
  ApplicationComposition.prepareBlock({
    init,
    update,
    view,
  })
export const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
