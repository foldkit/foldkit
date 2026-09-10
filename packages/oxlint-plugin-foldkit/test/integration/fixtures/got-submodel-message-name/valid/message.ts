import { Schema as S } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import * as Child from './child'
import { ValidationMessage } from './validation'

const Message = defineMessageUnion({
  OpenedChild: {},
  ReceivedMessage: { message: S.String, },
  ReceivedValidation: { message: ValidationMessage, },
  GotChildMessage: { message: Child.Message, },
})

export const localUnion = () => {
  const defineMessageUnion = (cases: unknown) => cases

  return defineMessageUnion({ ChildChanged: { message: Child.Message } })
}
