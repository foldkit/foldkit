import { Schema as S } from 'effect'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'

const ClickedSave = m('ClickedSave')

const Message = S.Union([ClickedSave])
type Message = typeof Message.Type

// In a real app, this lives once at module level and is imported everywhere.
const h = html<Message>()

const saveButton = (isSaving: boolean) =>
  h.button(
    [h.Type('button'), h.Disabled(isSaving), h.OnClick(ClickedSave())],
    ['Save'],
  )
