import { defineMessageUnion } from 'foldkit/message'

import { Session } from '../../domain/session'
export const Message = defineMessageUnion({})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  SucceededLogin: { session: Session },
})
export type OutMessage = typeof OutMessage.Type
