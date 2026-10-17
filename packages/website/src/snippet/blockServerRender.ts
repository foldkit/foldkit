import { Server } from 'foldkit/experimental'

import { ApplicationComposition, init, update, view } from './blockProfile'

export const render = () =>
  Server.renderToString(ApplicationComposition, { init, update, view }, {})
