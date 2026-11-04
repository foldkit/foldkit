import { Effect } from 'effect'

import { SnippetDisclosureBlock } from './definition'
import { init } from './init'
import { MeasureSnippetHeight } from './mount'
import { update } from './update'
import { view } from './view'

export const EffectsLayer = MeasureSnippetHeight.layer

export const layer = SnippetDisclosureBlock.makeLayer(
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

export { SnippetDisclosureBlock }
