import { Effect } from 'effect'
import { Command } from 'foldkit'
import { pushUrl } from 'foldkit/navigation'

import { CompletedNavigateRoom } from './message'
import { roomRouter } from './route'

const NavigateToRoom = Command.define('NavigateToRoom', CompletedNavigateRoom)

export const navigateToRoom = (roomId: string) =>
  NavigateToRoom(
    pushUrl(roomRouter({ roomId })).pipe(Effect.as(CompletedNavigateRoom())),
  )
