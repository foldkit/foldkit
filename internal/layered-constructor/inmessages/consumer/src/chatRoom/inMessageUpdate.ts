import { ChatRoomComposition } from './composition'
import { disconnect } from './steps'

export const inMessageUpdate = ChatRoomComposition.makeInMessageUpdate({
  RequestedDisconnect: disconnect,
})
