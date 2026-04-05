import {
  attributesModule,
  classModule,
  datasetModule,
  eventListenersModule,
  init,
  propsModule,
  styleModule,
  toVNode,
} from 'snabbdom'

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
