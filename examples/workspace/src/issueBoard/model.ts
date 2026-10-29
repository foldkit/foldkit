import { Schema } from 'effect'

import { DragAndDropBlock } from '@foldkit/ui'

export const Model = Schema.Struct({
  dragAndDrop: DragAndDropBlock.Model,
  announcement: Schema.String,
})
export type Model = typeof Model.Type
