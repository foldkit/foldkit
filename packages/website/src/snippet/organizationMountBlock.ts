import { Effect } from 'effect'

import { PanelDefinition } from './definition'
import { init } from './init'
import { MeasurePanel } from './mount'
import { update } from './update'
import { view } from './view'

export const EffectsLayer = MeasurePanel.layer

export const PanelBlock = PanelDefinition.contract

export const layer = PanelDefinition.makeBlock(
  Effect.gen(function* () {
    return { children: [], init, update, view, EffectsLayer }
  }),
).layer
