import { Effect, Layer } from 'effect'

import { ApplicationBlock } from './block'
import { Home, Room } from './blocks'
import { HomeBinding, MaybeRoomInstanceBinding } from './composition'
import { EffectsLayer } from './effectsLayer'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = ApplicationBlock.makeLayer(
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
).pipe(Layer.provide(Layer.mergeAll(Home.layer, Room.layer)))
