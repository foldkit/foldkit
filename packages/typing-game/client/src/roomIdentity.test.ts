import {
  Array,
  Deferred,
  Effect,
  Layer,
  Option,
  Queue,
  Schema,
  Stream,
  pipe,
} from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { RpcTest } from 'effect/rpc'
import { AsyncData, Port, Runtime, Url } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { afterEach, describe, expect, test, vi } from 'vitest'

import * as Shared from '@typing-game/shared'

import { ApplicationComposition } from './composition'
import { Application } from './definition'
import { EffectsLayer } from './layer'
import { Message } from './message'
import { Model, RoomInstance } from './model'
import { Home, Room } from './page'
import { Message as HomeMessage } from './page/home/message'
import { Message as RoomMessage } from './page/room/message'
import { RoomAsyncData } from './page/room/model'
import { ApplicationRoute } from './route'
import { RoomsClient } from './rpc'
import { update } from './update'

const ROOM_A = 'room-a'
const ROOM_B = 'room-b'

const playerA0 = Shared.Player.make({
  id: 'initial-player',
  username: 'initial',
})
const playerA1 = Shared.Player.make({ id: 'player-a1', username: 'alice-1' })
const playerA2 = Shared.Player.make({ id: 'player-a2', username: 'alice-2' })
const playerB = Shared.Player.make({ id: 'player-b', username: 'bob' })

const makeRoom = (roomId: string, revision: number): Shared.Room =>
  Shared.Room.make({
    id: roomId,
    players: [],
    hostId: '',
    status: Shared.Waiting.make({}),
    maybeGame: Option.none(),
    maybeScoreboard: Option.none(),
    createdAt: revision,
    usedGameTexts: [],
  })

const routeUrl = (path: string): Url.Url =>
  pipe(Url.fromString(`https://typing-game.test${path}`), Option.getOrThrow)

const ports = {
  inbound: {
    changedRoute: Port.inbound(Schema.String),
    joinedRoom: Port.inbound(
      Schema.Struct({ roomId: Schema.String, username: Schema.String }),
    ),
    joinedRoomFromHome: Port.inbound(
      Schema.Struct({ roomId: Schema.String, username: Schema.String }),
    ),
    barrier: Port.inbound(Schema.Number),
  },
}

const testInputs = Application.subscriptions(entry => ({
  changedRoute: entry(
    'TestChangedRoute',
    {},
    {
      messages: [Message.ChangedUrl],
      modelToDependencies: () => ({}),
      handler: function* () {
        return () =>
          Port.stream(ports.inbound.changedRoute).pipe(
            Stream.map(path => Message.ChangedUrl({ url: routeUrl(path) })),
          )
      },
    },
  ),
  joinedRoom: entry(
    'TestJoinedRoom',
    {},
    {
      messages: [Message.GotRoomMessage],
      modelToDependencies: () => ({}),
      handler: function* () {
        return () =>
          Port.stream(ports.inbound.joinedRoom).pipe(
            Stream.flatMap(({ roomId, username }) =>
              Stream.make(
                Message.GotRoomMessage({
                  roomId,
                  message: RoomMessage.ChangedRoomPageUsername({
                    value: username,
                  }),
                }),
                Message.GotRoomMessage({
                  roomId,
                  message: RoomMessage.SubmittedJoinRoomFromPage(),
                }),
              ),
            ),
          )
      },
    },
  ),
  joinedRoomFromHome: entry(
    'TestJoinedRoomFromHome',
    {},
    {
      messages: [Message.GotHomeMessage],
      modelToDependencies: () => ({}),
      handler: function* () {
        return () =>
          Port.stream(ports.inbound.joinedRoomFromHome).pipe(
            Stream.flatMap(({ roomId, username }) =>
              Stream.make(
                Message.GotHomeMessage({
                  message: HomeMessage.ChangedUsername({ value: username }),
                }),
                Message.GotHomeMessage({
                  message: HomeMessage.SubmittedUsernameForm(),
                }),
                Message.GotHomeMessage({
                  message: HomeMessage.PressedKey({ key: 'ArrowDown' }),
                }),
                Message.GotHomeMessage({
                  message: HomeMessage.PressedKey({ key: 'Enter' }),
                }),
                Message.GotHomeMessage({
                  message: HomeMessage.ChangedRoomId({ value: roomId }),
                }),
                Message.GotHomeMessage({
                  message: HomeMessage.SubmittedJoinRoomForm(),
                }),
              ),
            ),
          )
      },
    },
  ),
  barrier: entry(
    'TestBarrier',
    {},
    {
      messages: [Message.CompletedNavigateInternal],
      modelToDependencies: () => ({}),
      handler: function* () {
        return () =>
          Port.stream(ports.inbound.barrier).pipe(
            Stream.map(() => Message.CompletedNavigateInternal()),
          )
      },
    },
  ),
}))

type JoinRequest = Readonly<{
  roomId: string
  deferred: Deferred.Deferred<Shared.RoomAndPlayer>
}>

type RoomEmitter = Readonly<{
  roomId: string
  emit: (update: Shared.RoomWithPlayerProgress) => void
}>

const getAt = <Value>(values: ReadonlyArray<Value>, index: number): Value =>
  pipe(values, Array.get(index), Option.getOrThrow)

const roomUpdate = (
  roomId: string,
  revision: number,
): Shared.RoomWithPlayerProgress => ({
  room: makeRoom(roomId, revision),
  maybePlayerProgress: Option.none(),
})

const modelText = (model: Model): string => {
  const route = ApplicationRoute.match(model.route, {
    Home: () => 'home',
    Room: ({ roomId }) => roomId,
    NotFound: () => 'not-found',
  })

  return Option.match(model.maybeRoomInstance, {
    onNone: () => `${route}|none`,
    onSome: roomInstance => {
      const player = Option.match(roomInstance.model.maybeSession, {
        onNone: () => 'none',
        onSome: session => session.player.id,
      })
      const revision = pipe(
        AsyncData.getData(roomInstance.model.roomAsyncData),
        Option.map(room => `${room.createdAt}`),
        Option.getOrElse(() => 'none'),
      )

      return `${route}|${roomInstance.roomId}:${player}:${revision}`
    },
  })
}

const view = ApplicationComposition.makeView((model, h) =>
  h.div([], [modelText(model)]),
)

const readText = (): string => document.body.textContent ?? ''

const waitForText = (text: string): Promise<void> =>
  vi.waitFor(() => expect(readText()).toBe(text), { timeout: 3_000 })

const settle = (): Promise<void> => Effect.runPromise(Effect.sleep('10 millis'))

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Room identity', () => {
  test('keeps Command and Subscription results with their keyed Room occurrence', async () => {
    const joinRequests: globalThis.Array<JoinRequest> = []
    const emitters: globalThis.Array<RoomEmitter> = []
    const streamStarts: globalThis.Array<string> = []
    const streamStops: globalThis.Array<string> = []
    const liftedJoinOrigins: globalThis.Array<string> = []
    const liftedHomeJoinOrigins: globalThis.Array<string> = []
    const completedJoinRequests: globalThis.Array<Deferred.Deferred<void>> = []
    let clientAcquisitions = 0
    let clientReleases = 0
    let completedBarriers = 0

    const observedUpdate = (model: Model, message: Message) => {
      if (
        message._tag === 'GotRoomMessage' &&
        message.message._tag === 'SucceededJoinRoom'
      ) {
        liftedJoinOrigins.push(message.roomId)
      }
      if (
        message._tag === 'GotHomeMessage' &&
        message.message._tag === 'SucceededJoinRoomFromHome'
      ) {
        liftedHomeJoinOrigins.push(message.message.roomId)
      }
      if (message._tag === 'CompletedNavigateInternal') {
        completedBarriers += 1
      }

      return update(model, message)
    }

    const RoomHandlersLayer = Shared.RoomRpcs.toLayer(
      Effect.succeed({
        createRoom: ({ username }) =>
          Effect.succeed({
            room: makeRoom('created-room', 0),
            player: Shared.Player.make({ id: 'created-player', username }),
          }),
        joinRoom: ({ roomId }) => {
          const deferred = Deferred.makeUnsafe<Shared.RoomAndPlayer>()
          joinRequests.push({ roomId, deferred })
          return Deferred.await(deferred)
        },
        getRoomById: ({ roomId }) =>
          Effect.succeed(makeRoom(roomId, roomId === ROOM_A ? 10 : 20)),
        subscribeToRoom: ({ roomId }) =>
          Stream.callback<Shared.RoomWithPlayerProgress>(queue =>
            Effect.acquireRelease(
              Effect.sync(() => {
                streamStarts.push(roomId)
                const emitter = {
                  roomId,
                  emit: (update: Shared.RoomWithPlayerProgress) => {
                    Queue.offerUnsafe(queue, update)
                  },
                }
                emitters.push(emitter)
                return emitter
              }),
              () =>
                Effect.sync(() => {
                  streamStops.push(roomId)
                }),
            ).pipe(Effect.flatMap(() => Effect.never)),
          ),
        startGame: () => Effect.void,
        updatePlayerProgress: () => Effect.void,
      }),
    )
    const RoomsClientLayer = Layer.effect(
      RoomsClient,
      Effect.acquireRelease(
        RpcTest.makeClient(Shared.RoomRpcs).pipe(
          Effect.tap(() =>
            Effect.sync(() => {
              clientAcquisitions += 1
            }),
          ),
        ),
        () =>
          Effect.sync(() => {
            clientReleases += 1
          }),
      ).pipe(
        Effect.map(client => {
          const joinRoom: typeof client.joinRoom = (payload, options) => {
            const completed = Deferred.makeUnsafe<void>()
            completedJoinRequests.push(completed)

            return client.joinRoom(payload, options).pipe(
              Effect.ensuring(
                Effect.sync(() => {
                  queueMicrotask(() => {
                    Effect.runSync(Deferred.succeed(completed, undefined))
                  })
                }),
              ),
            )
          }

          return RoomsClient.of({
            createRoom: client.createRoom,
            joinRoom,
            getRoomById: client.getRoomById,
            subscribeToRoom: client.subscribeToRoom,
            startGame: client.startGame,
            updatePlayerProgress: client.updatePlayerProgress,
          })
        }),
      ),
    ).pipe(Layer.provide(RoomHandlersLayer))
    const KeyValueStoreLayer = Layer.succeed(
      KeyValueStore.KeyValueStore,
      KeyValueStore.makeStringOnly({
        get: () => Effect.succeed(undefined),
        set: () => Effect.void,
        remove: () => Effect.void,
        clear: Effect.void,
        size: Effect.succeed(0),
      }),
    )

    const initialRoomInit = Room.block.init(Option.none())
    const initialRoomModel = modifyFields(initialRoomInit.model, {
      roomAsyncData: () =>
        RoomAsyncData.Success({ data: makeRoom(ROOM_A, 10) }),
      username: () => 'alice',
    })
    const container = document.createElement('div')
    container.id = 'room-identity'
    document.body.append(container)

    const application = ApplicationComposition.makeElement({
      container,
      init: () => ({
        model: Model.make({
          route: ApplicationRoute.Room({ roomId: ROOM_A }),
          home: Home.block.init().model,
          maybeRoomInstance: Option.some(
            RoomInstance.make({ roomId: ROOM_A, model: initialRoomModel }),
          ),
        }),
      }),
      update: observedUpdate,
      view,
      subscriptions: testInputs,
      EffectsLayer: Layer.mergeAll(
        EffectsLayer,
        testInputs.changedRoute.layer,
        testInputs.joinedRoom.layer,
        testInputs.joinedRoomFromHome.layer,
        testInputs.barrier.layer,
      ),
      ports,
      crash: {
        view: ({ error }, h) => h.div([], [`Crash: ${error.message}`]),
      },
    }).provide(Layer.mergeAll(RoomsClientLayer, KeyValueStoreLayer))
    const handle = Runtime.embed(application)
    const awaitJoinCompletion = async (index: number): Promise<void> => {
      await Effect.runPromise(
        Deferred.await(getAt(completedJoinRequests, index)),
      )

      const nextCompletedBarriers = completedBarriers + 1
      handle.ports.barrier.send(nextCompletedBarriers)
      await vi.waitFor(() =>
        expect(completedBarriers).toBe(nextCompletedBarriers),
      )
    }

    try {
      await vi.waitFor(
        () => {
          expect(clientAcquisitions).toBe(1)
        },
        { timeout: 3_000 },
      )
      await waitForText(`${ROOM_A}|${ROOM_A}:none:10`)

      handle.ports.joinedRoom.send({ roomId: ROOM_A, username: 'initial' })
      await vi.waitFor(() => expect(joinRequests).toHaveLength(1))
      Effect.runSync(
        Deferred.succeed(getAt(joinRequests, 0).deferred, {
          room: makeRoom(ROOM_A, 10),
          player: playerA0,
        }),
      )
      await vi.waitFor(() => expect(liftedJoinOrigins).toHaveLength(1))
      expect(liftedJoinOrigins).toEqual([ROOM_A])
      await waitForText(`${ROOM_A}|${ROOM_A}:initial-player:10`)
      await vi.waitFor(() => expect(streamStarts).toEqual([ROOM_A]))

      const firstAEmitter = getAt(emitters, 0)
      firstAEmitter.emit(roomUpdate(ROOM_A, 11))
      await waitForText(`${ROOM_A}|${ROOM_A}:initial-player:11`)

      handle.ports.joinedRoom.send({ roomId: ROOM_A, username: 'alice' })
      await vi.waitFor(() => expect(joinRequests).toHaveLength(2))

      handle.ports.changedRoute.send(`/room/${ROOM_B}`)
      await waitForText(`${ROOM_B}|${ROOM_B}:none:20`)
      await vi.waitFor(() => expect(streamStops).toEqual([ROOM_A]))

      firstAEmitter.emit(roomUpdate(ROOM_A, 99))
      await settle()
      expect(readText()).toBe(`${ROOM_B}|${ROOM_B}:none:20`)

      handle.ports.joinedRoom.send({ roomId: ROOM_B, username: 'bob' })
      await vi.waitFor(() => expect(joinRequests).toHaveLength(3))
      Effect.runSync(
        Deferred.succeed(getAt(joinRequests, 2).deferred, {
          room: makeRoom(ROOM_B, 20),
          player: playerB,
        }),
      )
      await vi.waitFor(() => expect(liftedJoinOrigins).toHaveLength(2))
      expect(liftedJoinOrigins).toEqual([ROOM_A, ROOM_B])
      await waitForText(`${ROOM_B}|${ROOM_B}:player-b:20`)
      await vi.waitFor(() => expect(streamStarts).toEqual([ROOM_A, ROOM_B]))

      const roomBEmitter = getAt(emitters, 1)
      roomBEmitter.emit(roomUpdate(ROOM_B, 21))
      await waitForText(`${ROOM_B}|${ROOM_B}:player-b:21`)
      await settle()

      handle.ports.changedRoute.send(`/room/${ROOM_A}`)
      await waitForText(`${ROOM_A}|${ROOM_A}:none:10`)
      await vi.waitFor(() => expect(streamStops).toEqual([ROOM_A, ROOM_B]))

      roomBEmitter.emit(roomUpdate(ROOM_B, 98))
      Effect.runSync(
        Deferred.succeed(getAt(joinRequests, 1).deferred, {
          room: makeRoom(ROOM_A, 10),
          player: playerA1,
        }),
      )
      await awaitJoinCompletion(1)
      expect(liftedJoinOrigins).toEqual([ROOM_A, ROOM_B])
      expect(readText()).toBe(`${ROOM_A}|${ROOM_A}:none:10`)

      handle.ports.joinedRoom.send({ roomId: ROOM_A, username: 'alice-2' })
      await vi.waitFor(() => expect(joinRequests).toHaveLength(4))
      Effect.runSync(
        Deferred.succeed(getAt(joinRequests, 3).deferred, {
          room: makeRoom(ROOM_A, 10),
          player: playerA2,
        }),
      )
      await vi.waitFor(() => expect(liftedJoinOrigins).toHaveLength(3))
      expect(liftedJoinOrigins).toEqual([ROOM_A, ROOM_B, ROOM_A])
      await waitForText(`${ROOM_A}|${ROOM_A}:player-a2:10`)
      await vi.waitFor(() =>
        expect(streamStarts).toEqual([ROOM_A, ROOM_B, ROOM_A]),
      )

      firstAEmitter.emit(roomUpdate(ROOM_A, 97))
      await settle()
      expect(readText()).toBe(`${ROOM_A}|${ROOM_A}:player-a2:10`)

      const secondAEmitter = getAt(emitters, 2)
      secondAEmitter.emit(roomUpdate(ROOM_A, 12))
      await waitForText(`${ROOM_A}|${ROOM_A}:player-a2:12`)

      handle.ports.changedRoute.send('/')
      await waitForText('home|none')
      await vi.waitFor(() =>
        expect(streamStops).toEqual([ROOM_A, ROOM_B, ROOM_A]),
      )

      handle.ports.joinedRoomFromHome.send({
        roomId: ROOM_A,
        username: 'late-home-join',
      })
      await vi.waitFor(() => expect(joinRequests).toHaveLength(5))

      handle.ports.changedRoute.send(`/room/${ROOM_B}`)
      await waitForText(`${ROOM_B}|${ROOM_B}:none:20`)
      handle.ports.changedRoute.send('/')
      await waitForText('home|none')

      Effect.runSync(
        Deferred.succeed(getAt(joinRequests, 4).deferred, {
          room: makeRoom(ROOM_A, 10),
          player: playerA1,
        }),
      )
      await awaitJoinCompletion(4)
      expect(liftedHomeJoinOrigins).toEqual([])
      expect(readText()).toBe('home|none')

      expect(clientAcquisitions).toBe(1)
      expect(clientReleases).toBe(0)
    } finally {
      handle.dispose()
    }

    await vi.waitFor(() => {
      expect(streamStops).toEqual([ROOM_A, ROOM_B, ROOM_A])
      expect(clientReleases).toBe(1)
    })
  })
})
