import { ApiReferenceBlock } from './block'
import { LoadApiData } from './command'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

const EffectsLayer = LoadApiData.layer

export const layer = ApiReferenceBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer,
})
