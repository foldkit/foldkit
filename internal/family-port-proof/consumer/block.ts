import { Effect, Layer } from 'effect'
import * as Query from 'foldkit/experimental/query'
import * as Story from 'foldkit/story'

import * as Listbox from '@foldkit/ui/listbox'

import {
  ApplicationComposition,
  CatalogBinding,
  FruitListboxBinding,
} from './composition.js'
import { ApplicationBlock, Message } from './contracts.js'
import { update } from './update.js'
import { view } from './view.js'

export const init = ApplicationComposition.makeInit(() => ({
  model: { selectedFruit: 'Apple' },
}))
export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const catalog = yield* CatalogBinding
    const fruitListbox = yield* FruitListboxBinding

    return {
      children: [catalog, fruitListbox],
      init,
      update,
      view,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(Query.layer, Listbox.layer)))
export const pureStory = Story.withBlock(
  { block: ApplicationBlock, layer },
  executable => {
    const initial = executable.init()

    return executable.update(initial.model, Message.ClickedRefresh())
  },
)
