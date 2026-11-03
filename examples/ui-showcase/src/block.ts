import { Effect } from 'effect'

import { Ui } from './blocks'
import { EffectsLayer } from './command'
import { UiModelBinding } from './composition'
import { ApplicationDefinition } from './definition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const ui = yield* UiModelBinding

    return {
      children: [ui],
      init,
      update,
      view,
      EffectsLayer,
    }
  }),
).provide(Ui.layer)
