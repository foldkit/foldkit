import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  ClickedLogout: {},
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  RequestedLogout: {},
})
export type OutMessage = typeof OutMessage.Type
