import { Effect, Match as M, Schema as S } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import { DataCommand } from 'foldkit'
import { load, pushUrl } from 'foldkit/navigation'
import { ts } from 'foldkit/schema'

import {
  CompletedLoadExternal,
  CompletedNavigateInternal,
  CompletedNavigateRoom,
  GotHomeMessage,
  GotRoomMessage,
  Message,
} from './message'
import { Home, Room } from './page'
import { roomRouter } from './route'
import { RoomsClient } from './rpc.js'

export const NavigateToRoom = ts('NavigateToRoom', { roomId: S.String })
export const NavigateInternal = ts('NavigateInternal', { url: S.String })
export const LoadExternal = ts('LoadExternal', { href: S.String })
export const LiftHome = ts('LiftHome', { command: Home.Command })
export const LiftRoom = ts('LiftRoom', { command: Room.Command })

export const Command = S.Union([
  NavigateToRoom,
  NavigateInternal,
  LoadExternal,
  LiftHome,
  LiftRoom,
])
export type Command = typeof Command.Type

const liftHome = DataCommand.delegate(Home.execute, message =>
  GotHomeMessage({ message }),
)

const liftRoom = DataCommand.delegate(Room.execute, message =>
  GotRoomMessage({ message }),
)

export const execute = (
  command: Command,
): Effect.Effect<Message, never, RoomsClient | KeyValueStore.KeyValueStore> =>
  M.value(command).pipe(
    M.tagsExhaustive({
      NavigateToRoom: ({ roomId }) =>
        pushUrl(roomRouter({ roomId })).pipe(
          Effect.as(CompletedNavigateRoom()),
        ),

      NavigateInternal: ({ url }) =>
        pushUrl(url).pipe(Effect.as(CompletedNavigateInternal())),

      LoadExternal: ({ href }) =>
        load(href).pipe(Effect.as(CompletedLoadExternal())),

      LiftHome: ({ command }) => liftHome(command),

      LiftRoom: ({ command }) => liftRoom(command),
    }),
  )
