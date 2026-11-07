import { Effect, Layer } from 'effect'

import { Dialog, Listbox } from '@foldkit/ui'

import { CreateIssueBlock } from './block'
import { CreateIssue } from './command'
import { CreateIssueComposition } from './composition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = CreateIssueBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* CreateIssueComposition.acquireChildren()

    return {
      children,
      init,
      update,
      inMessageUpdate,
      view,
      EffectsLayer: CreateIssue.layer,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(Dialog.layer, Listbox.layer)))
