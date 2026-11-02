import { Effect, Layer } from 'effect'

import { Dialog } from '@foldkit/ui'

import { DialogBinding } from './composition'
import { SearchDefinition } from './definition'
import { init } from './init'
import { EffectsLayer } from './layer'
import { receive } from './receive'
import { update } from './update'
import { view } from './view'

export const SearchBlock = SearchDefinition.contract

const block = SearchDefinition.makeBlock(
  Effect.gen(function* () {
    const dialog = yield* DialogBinding

    return { children: [dialog], init, update, receive, view, EffectsLayer }
  }),
).provide(Layer.mergeAll(Dialog.layer))
export const layer = block.layer
