import { Effect, Layer } from 'effect'

import { HomeBinding, RoomBinding } from './composition'
import { ApplicationDefinition } from './definition'
import { init } from './init'
import { EffectsLayer } from './layer'
import * as Home from './page/home'
import * as Room from './page/room'
import { update } from './update'
import { view } from './view'

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const home = yield* HomeBinding
    const room = yield* RoomBinding
    return { children: [home, room], init, update, view, EffectsLayer }
  }),
).provide(Layer.mergeAll(Home.layer, Room.layer))
