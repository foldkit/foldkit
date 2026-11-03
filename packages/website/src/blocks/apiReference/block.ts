import { Effect } from 'effect'

import { LoadApiData } from './command'
import { ApiReferenceDefinition } from './definition'
import { init } from './init'
import { receive } from './receive'
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
      receive,
      view,
      EffectsLayer,
    }
  }),
)
export const layer = block.layer
