import { defineInMessageUnion } from 'foldkit/message'

import { ApplicationRoute } from '../../route'

export const InMessage = defineInMessageUnion({
  InformedOfRouteChange: { route: ApplicationRoute.People },
})
export type InMessage = typeof InMessage.Type
