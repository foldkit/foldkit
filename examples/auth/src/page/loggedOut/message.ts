import { defineMessageUnion } from 'foldkit/message'

import { Session } from '../../domain/session'
import * as Login from './page/login'

export const Message = defineMessageUnion({
  GotLoginMessage: { message: Login.Message },
})

export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  SucceededLogin: { session: Session },
})

export type OutMessage = typeof OutMessage.Type
