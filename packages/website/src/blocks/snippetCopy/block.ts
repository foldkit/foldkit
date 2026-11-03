import { Effect } from 'effect'

import { SnippetCopyDefinition } from './definition'
import { init } from './init'
import { EffectsLayer, update } from './update'
import { view } from './view'

export const SnippetCopyBlock = SnippetCopyDefinition.contract

const block = SnippetCopyDefinition.makeBlock(
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
export const layer = block.layer
