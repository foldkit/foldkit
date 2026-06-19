import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

const ClickedSave = m('ClickedSave')
const Message = S.Union([ClickedSave])
type Message = typeof Message.Type

// ❌ Bad
const badMessage: Message = {
  _tag: 'ClickedSave',
}

// ✅ Good
const goodMessage = ClickedSave()
