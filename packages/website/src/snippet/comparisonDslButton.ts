import { Schema as S } from 'effect'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'

const ClickedSave = m('ClickedSave')

const Message = S.Union(ClickedSave)
type Message = typeof Message.Type

const { button, Type, Disabled, OnClick } = html<Message>()

const saveButton = (isSaving: boolean) =>
  button([Type('button'), Disabled(isSaving), OnClick(ClickedSave())], ['Save'])
