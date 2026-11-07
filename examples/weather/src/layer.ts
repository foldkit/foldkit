import { ApplicationBlock } from './block'
import { FetchWeather } from './command'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = ApplicationBlock.makeLayer({
  init,
  update,
  view,
  EffectsLayer: FetchWeather.layer,
})
