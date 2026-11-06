import { defineInMessageUnion } from 'foldkit/message'

export const InMessage = defineInMessageUnion({
  RequestedOpenMobileMenu: {},
  RequestedCloseMobileMenu: {},
})
export type InMessage = typeof InMessage.Type
