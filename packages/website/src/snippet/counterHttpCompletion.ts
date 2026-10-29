import { Block } from 'foldkit'

import {
  ApplicationComposition,
  FetchCountLayer,
  type Model,
  update,
} from './counterHttpCommand'

export const init = ApplicationComposition.makeInit(
  (): Readonly<{ model: Model }> => ({
    model: { count: 0 },
  }),
)

export const view = ApplicationComposition.makeView((model, h) => ({
  title: `Count: ${model.count}`,
  body: h.p([], [model.count.toString()]),
}))

const prepare = () =>
  ApplicationComposition.prepareBlock({
    init,
    update,
    view,
    EffectsLayer: FetchCountLayer,
  })
export const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
