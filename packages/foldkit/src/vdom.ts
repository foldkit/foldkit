import {
  attributesModule,
  classModule,
  datasetModule,
  eventListenersModule,
  init,
  styleModule,
  toVNode,
} from 'snabbdom'

import { propsModule } from './propsModule'

export type { VNode } from 'snabbdom'
export { toVNode }

export const patch = init([
  attributesModule,
  classModule,
  datasetModule,
  eventListenersModule,
  propsModule,
  styleModule,
])
