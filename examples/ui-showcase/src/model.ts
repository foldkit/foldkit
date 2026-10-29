import { Schema } from 'effect'

import { ApplicationRoute } from './route'
import * as Ui from './ui'

export const Model = Schema.Struct({
  route: ApplicationRoute,
  uiModel: Ui.UiBlock.Model,
})
export type Model = typeof Model.Type
