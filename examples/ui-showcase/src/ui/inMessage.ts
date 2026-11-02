import { defineMessageUnion } from 'foldkit/message'

export const InMessage = defineMessageUnion({
  RequestedOpenMobileMenu: {},
  RequestedCloseMobileMenu: {},
})
export type InMessage = typeof InMessage.Type
