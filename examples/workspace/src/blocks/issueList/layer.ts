import { Effect, Layer } from 'effect'

import { Listbox } from '@foldkit/ui'

import { IssueListBlock } from './block'
import { IssueListComposition } from './composition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = IssueListBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* IssueListComposition.acquireChildren()

    return {
      children,
      init,
      update,
      view,
    }
  }),
).pipe(Layer.provide(Listbox.layer))
