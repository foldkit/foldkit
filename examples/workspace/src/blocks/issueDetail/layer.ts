import { Effect, Layer } from 'effect'

import { Listbox } from '@foldkit/ui'

import { IssueDetailBlock } from './block'
import { CommentComposer } from './blocks'
import { SaveIssue } from './command'
import { IssueDetailComposition } from './composition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = IssueDetailBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* IssueDetailComposition.acquireChildren()

    return {
      children,
      init,
      update,
      inMessageUpdate,
      view,
      EffectsLayer: SaveIssue.layer,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(Listbox.layer, CommentComposer.layer)))
