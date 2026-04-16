import { Schema as S } from 'effect'
import { Ui } from 'foldkit'
import { m } from 'foldkit/message'

export const GotDragAndDropMessage = m('GotDragAndDropMessage', {
  message: Ui.DragAndDrop.Message,
})
export const ClickedAddCard = m('ClickedAddCard', { columnId: S.String })
export const ChangedNewCardTitle = m('ChangedNewCardTitle', {
  value: S.String,
})
export const SubmittedNewCard = m('SubmittedNewCard')
export const CancelledNewCard = m('CancelledNewCard')
export const GeneratedCardId = m('GeneratedCardId', {
  cardId: S.String,
  columnId: S.String,
  title: S.String,
})
export const CompletedSaveBoard = m('CompletedSaveBoard')
export const CompletedFocusAddCardInput = m('CompletedFocusAddCardInput')

export const Message = S.Union(
  GotDragAndDropMessage,
  ClickedAddCard,
  ChangedNewCardTitle,
  SubmittedNewCard,
  CancelledNewCard,
  GeneratedCardId,
  CompletedSaveBoard,
  CompletedFocusAddCardInput,
)
export type Message = typeof Message.Type
