import { Schema } from 'effect'

import { Ui } from './blocks'
import { ApplicationRoute } from './route'

export const Model = Schema.Struct({
  route: ApplicationRoute,
  uiModel: Ui.UiBlock.Model,
})
export type Model = typeof Model.Type
