import { Schema as S } from 'effect'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'

const ClickedSave = m('ClickedSave')

const Message = S.Union([ClickedSave])
type Message = typeof Message.Type

const saveButton = (isSaving: boolean) => {
  const h = html<Message>()

  return h.button(
    [h.Type('button'), h.Disabled(isSaving), h.OnClick(ClickedSave())],
    ['Save'],
  )
}
