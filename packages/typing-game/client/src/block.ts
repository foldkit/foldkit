import { Effect, Layer } from 'effect'

import { Home, Room } from './blocks'
import { HomeBinding, MaybeRoomInstanceBinding } from './composition'
import { ApplicationDefinition } from './definition'
import { init } from './init'
import { EffectsLayer } from './layer'
import { update } from './update'
import { view } from './view'

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const home = yield* HomeBinding
    const room = yield* MaybeRoomInstanceBinding

    return {
      children: [home, room],
      init,
      update,
      view,
      EffectsLayer,
    }
  }),
).provide(Layer.mergeAll(Home.layer, Room.layer))
