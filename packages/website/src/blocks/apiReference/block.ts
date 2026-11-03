import { Effect } from 'effect'

import { LoadApiData } from './command'
import { ApiReferenceDefinition } from './definition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const ApiReferenceBlock = ApiReferenceDefinition.contract
const EffectsLayer = LoadApiData.layer

const block = ApiReferenceDefinition.makeBlock(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      inMessageUpdate,
      view,
      EffectsLayer,
    }
  }),
)
export const layer = block.layer
