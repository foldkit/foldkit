import { defineMessageUnion } from 'foldkit/message'

// MESSAGE

export const Message = defineMessageUnion({
  ClickedLogout: {},
})

export type Message = typeof Message.Type

// OUT MESSAGE

export const OutMessage = defineMessageUnion({
  RequestedLogout: {},
})

export type OutMessage = typeof OutMessage.Type
