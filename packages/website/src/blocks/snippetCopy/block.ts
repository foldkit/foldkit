import { Effect } from 'effect'

import { SnippetCopyBlock } from './definition'
import { init } from './init'
import { EffectsLayer, update } from './update'
import { view } from './view'

export const layer = SnippetCopyBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
      EffectsLayer,
    }
  }),
)

export { SnippetCopyBlock }
