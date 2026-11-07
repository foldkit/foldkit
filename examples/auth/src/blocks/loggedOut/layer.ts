import { Layer } from 'effect'

import { LoggedOutBlock } from './block'
import { Login } from './blocks'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = LoggedOutBlock.makeLayer({
  init,
  update,
  view,
}).pipe(Layer.provide(Login.layer))
