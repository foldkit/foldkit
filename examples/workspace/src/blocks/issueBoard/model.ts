import { Schema } from 'effect'

import { DragAndDrop } from '@foldkit/ui'

export const Model = Schema.Struct({
  dragAndDrop: DragAndDrop.DragAndDropBlock.Model,
  announcement: Schema.String,
})
export type Model = typeof Model.Type
