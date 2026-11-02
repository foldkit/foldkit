import { Effect } from 'effect'

import { EffectsLayer } from './command'
import { UiBinding } from './composition'
import { ApplicationDefinition } from './definition'
import { init } from './init'
import * as Ui from './ui'
import { update } from './update'
import { view } from './view'

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const ui = yield* UiBinding
    return { children: [ui], init, update, view, EffectsLayer }
  }),
).provide(Ui.layer)
