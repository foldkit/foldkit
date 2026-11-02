import { Effect, type Scope } from 'effect'

import { MessageComposerDefinition } from './definition'
import { init } from './init'
import { FocusInput } from './mount'
import { update } from './update'
import { view } from './view'

export const makeMessageComposerBlock = (
  graphLifetime: Effect.Effect<void, never, Scope.Scope> = Effect.void,
) =>
  MessageComposerDefinition.makeBlock(
    Effect.gen(function* () {
      yield* graphLifetime

      return {
        children: [],
        init,
        update,
        view,
        EffectsLayer: FocusInput.layer,
      }
    }),
  )

export const MessageComposerBlock = makeMessageComposerBlock()
