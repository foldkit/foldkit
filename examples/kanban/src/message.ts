import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { DragAndDrop } from '@foldkit/ui'

export const Message = defineMessageUnion({
  GotDragAndDropMessage: { message: DragAndDrop.Message },
  ClickedAddCard: { columnId: Schema.String },
  ChangedNewCardTitle: { value: Schema.String },
  SubmittedNewCard: {},
  CancelledNewCard: {},
  CompletedGenerateCardId: {
    cardId: Schema.String,
    columnId: Schema.String,
    title: Schema.String,
  },
  CompletedSaveBoard: {},
  CompletedFocusAddCardInput: {},
})

export type Message = typeof Message.Type
