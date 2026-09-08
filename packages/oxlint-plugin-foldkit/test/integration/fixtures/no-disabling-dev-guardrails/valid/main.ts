import { Runtime } from 'foldkit'

import { init, Model, update, view } from './app'

export const app = Runtime.makeApplication({ Model, init, update, view })

export const makeLocal = (Runtime: {
  makeApplication: (config: unknown) => unknown
}) => Runtime.makeApplication({ freezeModel: false })
