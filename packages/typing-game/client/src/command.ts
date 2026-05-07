import { Effect, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { pushUrl } from 'foldkit/navigation'

import { CompletedNavigateRoom } from './message'
import { roomRouter } from './route'

export const NavigateToRoom = Command.define(
  'NavigateToRoom',
  { roomId: S.String },
  CompletedNavigateRoom,
)(({ roomId }) =>
  pushUrl(roomRouter({ roomId })).pipe(Effect.as(CompletedNavigateRoom())),
)
