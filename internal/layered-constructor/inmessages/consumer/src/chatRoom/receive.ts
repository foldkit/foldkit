import { ChatRoomComposition } from './composition'
import { disconnect } from './steps'

export const receive = ChatRoomComposition.makeReceive({
  RequestedDisconnect: disconnect,
})
