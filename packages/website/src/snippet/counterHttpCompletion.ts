import { Effect } from 'effect'

import {
  ApplicationBlock,
  ApplicationComposition,
  FetchCountLayer,
  update,
} from './counterHttpCommand'

export const init = ApplicationComposition.makeInit(() => ({
  model: { count: 0 },
}))

export const view = ApplicationComposition.makeView((model, h) => ({
  title: `Count: ${model.count}`,
  body: h.p([], [model.count.toString()]),
}))

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
      EffectsLayer: FetchCountLayer,
    }
  }),
)

export { ApplicationBlock } from './counterHttpCommand'
