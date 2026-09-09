import { Schema } from 'effect'
import { Rpc, RpcGroup } from 'effect/unstable/rpc'

export const Waiting = Schema.TaggedStruct('Waiting', {})
export const GetReady = Schema.TaggedStruct('GetReady', {})
export const Countdown = Schema.TaggedStruct('Countdown', {
  secondsLeft: Schema.Number,
})
export const Playing = Schema.TaggedStruct('Playing', {
  secondsLeft: Schema.Number,
})
export const Finished = Schema.TaggedStruct('Finished', {})

export type Waiting = typeof Waiting.Type
export type GetReady = typeof GetReady.Type
export type Countdown = typeof Countdown.Type
export type Playing = typeof Playing.Type
export type Finished = typeof Finished.Type

export const GameStatus = Schema.Union([
  Waiting,
  GetReady,
  Countdown,
  Playing,
  Finished,
])
export type GameStatus = typeof GameStatus.Type

export const Player = Schema.Struct({
  id: Schema.String,
  username: Schema.String,
})
export type Player = typeof Player.Type

export const Game = Schema.Struct({
  id: Schema.String,
  text: Schema.String,
})
export type Game = typeof Game.Type

export const GamePlayer = Schema.Struct({
  gameId: Schema.String,
  playerId: Schema.String,
})
export type GamePlayer = typeof GamePlayer.Type

export const PlayerProgress = Schema.Struct({
  playerId: Schema.String,
  gameId: Schema.String,
  userText: Schema.String,
  updatedAt: Schema.Number,
  charsTyped: Schema.Number,
})
export type PlayerProgress = typeof PlayerProgress.Type

export const PlayerScore = Schema.Struct({
  playerId: Schema.String,
  username: Schema.String,
  wpm: Schema.Number,
  accuracy: Schema.Number,
  charsTyped: Schema.Number,
  correctChars: Schema.Number,
})
export type PlayerScore = typeof PlayerScore.Type

export const Scoreboard = Schema.Array(PlayerScore)
export type Scoreboard = typeof Scoreboard.Type

export const Room = Schema.Struct({
  id: Schema.String,
  players: Schema.Array(Player),
  hostId: Schema.String,
  status: GameStatus,
  maybeGame: Schema.Option(Game),
  maybeScoreboard: Schema.Option(Scoreboard),
  createdAt: Schema.Number,
  usedGameTexts: Schema.Array(Schema.String),
})
export type Room = typeof Room.Type

export const RoomById = Schema.HashMap(Schema.String, Room)
export type RoomById = typeof RoomById.Type

export class RoomNotFoundError extends Schema.TaggedError<RoomNotFoundError>()(
  'RoomNotFoundError',
  {
    roomId: Schema.String,
  },
) {}

export class UnauthorizedError extends Schema.TaggedError<UnauthorizedError>()(
  'UnauthorizedError',
  {
    message: Schema.String,
  },
) {}

export const RoomAndPlayer = Schema.Struct({ player: Player, room: Room })
export type RoomAndPlayer = typeof RoomAndPlayer.Type

export const RoomWithPlayerProgress = Schema.Struct({
  room: Room,
  maybePlayerProgress: Schema.Option(PlayerProgress),
})
export type RoomWithPlayerProgress = typeof RoomWithPlayerProgress.Type

export const createRoomRpc = Rpc.make('createRoom', {
  payload: Schema.Struct({ username: Schema.String }),
  success: RoomAndPlayer,
})

export const joinRoomRpc = Rpc.make('joinRoom', {
  payload: Schema.Struct({ username: Schema.String, roomId: Schema.String }),
  success: RoomAndPlayer,
  error: RoomNotFoundError,
})

export const getRoomByIdRpc = Rpc.make('getRoomById', {
  payload: Schema.Struct({ roomId: Schema.String }),
  success: Room,
  error: RoomNotFoundError,
})

export const subscribeToRoomRpc = Rpc.make('subscribeToRoom', {
  payload: Schema.Struct({ roomId: Schema.String, playerId: Schema.String }),
  success: RoomWithPlayerProgress,
  error: RoomNotFoundError,
  stream: true,
})

export const startGameRpc = Rpc.make('startGame', {
  payload: Schema.Struct({ roomId: Schema.String, playerId: Schema.String }),
  success: Schema.Void,
  error: Schema.Union([RoomNotFoundError, UnauthorizedError]),
})

export const updatePlayerProgressRpc = Rpc.make('updatePlayerProgress', {
  payload: Schema.Struct({
    playerId: Schema.String,
    gameId: Schema.String,
    userText: Schema.String,
    charsTyped: Schema.Number,
  }),
  success: Schema.Void,
})

export const RoomRpcs = RpcGroup.make(
  createRoomRpc,
  joinRoomRpc,
  getRoomByIdRpc,
  subscribeToRoomRpc,
  startGameRpc,
  updatePlayerProgressRpc,
)
export type RoomRpcs = typeof RoomRpcs
