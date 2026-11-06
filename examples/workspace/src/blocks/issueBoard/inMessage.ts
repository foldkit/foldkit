import { defineInMessageUnion } from 'foldkit/message'

export const InMessage = defineInMessageUnion({
  InformedOfIssueMoveFailure: {},
})
export type InMessage = typeof InMessage.Type
