import { Effect } from 'effect'

import { SnippetDisclosureDefinition } from './definition'
import { init } from './init'
import { MeasureSnippetHeight } from './mount'
import { update } from './update'
import { view } from './view'

export const EffectsLayer = MeasureSnippetHeight.layer

export const SnippetDisclosureBlock = SnippetDisclosureDefinition.contract

const block = SnippetDisclosureDefinition.makeBlock(
  Effect.gen(function* () {
    return { children: [], init, update, view, EffectsLayer }
  }),
)
export const layer = block.layer
