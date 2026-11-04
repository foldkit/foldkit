import { Server } from 'foldkit/experimental'

import { ApplicationBlock, layer } from './blockProfile'

export const render = () =>
  Server.renderToString({ block: ApplicationBlock, layer }, {}, {})
