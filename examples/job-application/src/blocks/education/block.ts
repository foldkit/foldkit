import { Effect, Layer } from 'effect'

import { EducationEntry as Entry } from './blocks'
import { EffectsLayer } from './command'
import { EntriesBinding } from './composition'
import { EducationDefinition } from './definition'
import { init } from './init'
import { receive } from './receive'
import { update } from './update'
import { view } from './view'

export const EducationBlock = EducationDefinition.contract
export const layer = EducationDefinition.makeBlock(
  Effect.gen(function* () {
    const entries = yield* EntriesBinding

    return { children: [entries], init, update, receive, view, EffectsLayer }
  }),
).provide(Layer.mergeAll(Entry.layer)).layer
