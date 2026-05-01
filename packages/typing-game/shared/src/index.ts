import { Schema as S } from 'effect'
import { Rpc, RpcGroup } from 'effect/unstable/rpc'

export const Waiting = S.TaggedStruct('Waiting', {})
export const GetReady = S.TaggedStruct('GetReady', {})
export const Countdown = S.TaggedStruct('Countdown', { secondsLeft: S.Number })
export const Playing = S.TaggedStruct('Playing', { secondsLeft: S.Number })
export const Finished = S.TaggedStruct('Finished', {})

export type Waiting = typeof Waiting.Type
export type GetReady = typeof GetReady.Type
export type Countdown = typeof Countdown.Type
export type Playing = typeof Playing.Type
export type Finished = typeof Finished.Type

export const GameStatus = S.Union([
  Waiting,
  GetReady,
  Countdown,
  Playing,
  Finished,
])
export type GameStatus = typeof GameStatus.Type

export const Player = S.Struct({
  id: S.String,
  username: S.String,
})
export type Player = typeof Player.Type

export const Game = S.Struct({
  id: S.String,
  text: S.String,
})
export type Game = typeof Game.Type

export const GamePlayer = S.Struct({
  gameId: S.String,
  playerId: S.String,
})
export type GamePlayer = typeof GamePlayer.Type

export const PlayerProgress = S.Struct({
  playerId: S.String,
  gameId: S.String,
  userText: S.String,
  updatedAt: S.Number,
  charsTyped: S.Number,
})
export type PlayerProgress = typeof PlayerProgress.Type

export const PlayerScore = S.Struct({
  playerId: S.String,
  username: S.String,
  wpm: S.Number,
  accuracy: S.Number,
  charsTyped: S.Number,
  correctChars: S.Number,
})
export type PlayerScore = typeof PlayerScore.Type

export const Scoreboard = S.Array(PlayerScore)
export type Scoreboard = typeof Scoreboard.Type

export const Room = S.Struct({
  id: S.String,
  players: S.Array(Player),
  hostId: S.String,
  status: GameStatus,
  maybeGame: S.Option(Game),
  maybeScoreboard: S.Option(Scoreboard),
  createdAt: S.Number,
  usedGameTexts: S.Array(S.String),
})
export type Room = typeof Room.Type

export const RoomById = S.HashMap(S.String, Room)
export type RoomById = typeof RoomById.Type

export class RoomNotFoundError extends S.TaggedErrorClass<RoomNotFoundError>()(
  'RoomNotFoundError',
  {
    roomId: S.String,
  },
) {}

export class UnauthorizedError extends S.TaggedErrorClass<UnauthorizedError>()(
  'UnauthorizedError',
  {
    message: S.String,
  },
) {}

export const RoomAndPlayer = S.Struct({ player: Player, room: Room })
export type RoomAndPlayer = typeof RoomAndPlayer.Type

export const RoomWithPlayerProgress = S.Struct({
  room: Room,
  maybePlayerProgress: S.Option(PlayerProgress),
})
export type RoomWithPlayerProgress = typeof RoomWithPlayerProgress.Type

export const createRoomRpc = Rpc.make('createRoom', {
  payload: S.Struct({ username: S.String }),
  success: RoomAndPlayer,
})

export const joinRoomRpc = Rpc.make('joinRoom', {
  payload: S.Struct({ username: S.String, roomId: S.String }),
  success: RoomAndPlayer,
  error: RoomNotFoundError,
})

export const getRoomByIdRpc = Rpc.make('getRoomById', {
  payload: S.Struct({ roomId: S.String }),
  success: Room,
  error: RoomNotFoundError,
})

export const subscribeToRoomRpc = Rpc.make('subscribeToRoom', {
  payload: S.Struct({ roomId: S.String, playerId: S.String }),
  success: RoomWithPlayerProgress,
  error: RoomNotFoundError,
  stream: true,
})

export const startGameRpc = Rpc.make('startGame', {
  payload: S.Struct({ roomId: S.String, playerId: S.String }),
  success: S.Void,
  error: S.Union([RoomNotFoundError, UnauthorizedError]),
})

export const updatePlayerProgressRpc = Rpc.make('updatePlayerProgress', {
  payload: S.Struct({
    playerId: S.String,
    gameId: S.String,
    userText: S.String,
    charsTyped: S.Number,
  }),
  success: S.Void,
})

export class RoomRpcs extends RpcGroup.make(
  createRoomRpc,
  joinRoomRpc,
  getRoomByIdRpc,
  subscribeToRoomRpc,
  startGameRpc,
  updatePlayerProgressRpc,
) {}
