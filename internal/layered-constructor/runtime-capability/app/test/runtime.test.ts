import { Array, Context, Effect, Exit, Layer, Option, Scope } from 'effect'
import { Socket } from 'effect/socket'
import * as Story from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { describe, expect, it } from 'vitest'

import {
  runtimeBindingsOf,
  runtimeBindingOf,
} from '../../../packages/foldkit/dist/block/composition.js'
import { isResourceKey } from '../../../packages/foldkit/dist/block/identity.js'
import {
  CommandInstancesTypeId,
  CurrentInstance,
} from '../../../packages/foldkit/dist/block/instanceContext.js'
import { lowerBlock } from '../../../packages/foldkit/dist/block/lowering.js'
import { declareRuntimeCapability } from '../../../packages/foldkit/dist/block/runtimeCapability.js'
import {
  qualifyEffect,
  qualifyLayer,
} from '../../../packages/foldkit/dist/block/scope.js'
import { acquisitionOf } from '../../../packages/foldkit/dist/experimental/constructed/symbolic.js'
import { makeCompositionRuntime } from '../../../packages/foldkit/dist/runtime/compositionRuntime.js'
import { makeResourceProvider } from '../../../packages/foldkit/dist/runtime/resourceProvider.js'
import { toParentMessage } from '../../../packages/foldkit/dist/test/toParentMessage.js'
import { ApplicationBlock } from '../src/application'
import { ChatSocket } from '../src/chatRoom/chatSocket'
import { MessageComposerBinding } from '../src/chatRoom/composition'
import { ChatRoomContract } from '../src/chatRoom/definition'
import { Message } from '../src/chatRoom/message'
import { ConnectionState } from '../src/chatRoom/model'
import {
  AuditLog,
  ConfiguredBlock,
  StartupConfiguration,
} from '../src/constructionServices'
import { EagerReadBlock, FailureBlock } from '../src/errors'
import { Message as ComposerMessage } from '../src/messageComposer/message'
import { ChatRoomWithComposerBlock } from '../src/provided'
import { ControlledSocket } from './controlledSocket'

const AppLayer = ApplicationBlock.layer.pipe(
  Layer.provideMerge(ChatRoomWithComposerBlock.layer),
)

describe('Runtime-installed opaque occurrence capability', () => {
  it('keeps constructor Services separate from handler construction Services', async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const graph = yield* Layer.build(ConfiguredBlock.layer).pipe(
            Effect.provideService(StartupConfiguration, {
              initialValue: 'Configured',
            }),
          )
          const block = yield* ConfiguredBlock.get.pipe(
            Effect.provideContext(graph),
          )
          expect(block.init().model.value).toBe('Configured')
          const handlers = yield* Layer.build(block.EffectsLayer).pipe(
            Effect.provideService(AuditLog, 'Audit'),
          )
          expect(
            Array.some(Array.fromIterable(handlers.mapUnsafe.keys()), key =>
              key.startsWith('foldkit/RuntimeCapability/'),
            ),
          ).toBe(false)
        }),
      ),
    )
  })

  it('keeps pure Story construction free of handler Service mocks', () =>
    Effect.runPromise(
      Story.story(
        ChatRoomWithComposerBlock,
        Story.init({ title: 'General', inputId: 'general' }),
        Story.message(Message.ConnectedChatSocket()),
        Story.messageIn(
          MessageComposerBinding,
          ComposerMessage.UpdatedText({ value: 'Pure draft' }),
        ),
        Story.model(model => {
          expect(model.messageComposer.text).toBe('Pure draft')
        }),
      ),
    ))

  it('builds ordinary handlers without occurrence refs but rejects detached command execution', async () => {
    const exit = await Effect.runPromiseExit(
      Effect.scoped(
        Effect.gen(function* () {
          const graph = yield* Layer.build(ChatRoomWithComposerBlock.layer)
          const room = yield* ChatRoomContract.get.pipe(
            Effect.provideContext(graph),
          )
          const handlers = yield* Layer.build(room.EffectsLayer).pipe(
            Effect.provideService(
              Socket.WebSocketConstructor,
              () => new ControlledSocket(),
            ),
          )
          expect(handlers.mapUnsafe.has(ChatSocket._tag.key)).toBe(false)
          const roomInit = room.init({ title: 'Detached', inputId: 'detached' })
          const received = room.update(
            roomInit.model,
            Message.ReceivedMessage({ text: 'Detached' }),
          )
          const command = Option.getOrThrow(Array.head(received.commands ?? []))

          return yield* command.effect.pipe(Effect.provideContext(handlers))
        }),
      ),
    )
    expect(Exit.isFailure(exit)).toBe(true)
    expect(String(exit)).toContain('RuntimeCapability')
  })

  it('denies public resource access during selected Layer construction without private refs', async () => {
    const exit = await Effect.runPromiseExit(
      Effect.scoped(
        Effect.gen(function* () {
          const graph = yield* Layer.build(EagerReadBlock.layer)
          const block = yield* EagerReadBlock.get.pipe(
            Effect.provideContext(graph),
          )

          return yield* Layer.build(block.EffectsLayer)
        }),
      ),
    )
    expect(Exit.isFailure(exit)).toBe(true)
    expect(String(exit)).toContain(
      'cannot be read while constructing a handler',
    )
    expect(String(exit)).not.toContain('Service not found')
  })

  it('retains a typed handler-construction failure inside an authentic Runtime', async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const scope = yield* Effect.scope
          const graph = yield* Layer.build(FailureBlock.layer)
          const block = yield* FailureBlock.get.pipe(
            Effect.provideContext(graph),
          )
          const raw = acquisitionOf(block).block
          const provider = yield* makeResourceProvider({
            managedResources: {},
            runtimeScope: scope,
            maybePortChannels: Option.none(),
            applicationLayer: undefined,
          })
          const runtime = yield* makeCompositionRuntime({
            block: raw,
            initModel: block.init().model,
            context: provider.applicationContext,
            runtimeScope: scope,
            enqueueMessage: () => undefined,
            crashWith: cause => Effect.die(cause),
            maybeSlowSubscriptionDependencies: Option.none(),
          })
          const failure = yield* Effect.exit(
            Layer.build(block.EffectsLayer).pipe(
              Effect.provideContext(
                Context.makeUnsafe(runtime.context.mapUnsafe),
              ),
            ),
          )

          expect(Exit.isFailure(failure)).toBe(true)
          expect(String(failure)).toContain('HandlerUnavailable')
        }),
      ),
    )
  })

  it('uses real separate refs in two fields and a keyed collection with one memoized handler Layer', async () => {
    const sockets: Array<ControlledSocket> = []
    const crashes: Array<string> = []
    let keyedSocket: ControlledSocket | undefined
    const makeSocket = () => {
      const socket = new ControlledSocket()
      sockets.push(socket)
      queueMicrotask(() => socket.open())

      return socket
    }

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const scope = yield* Effect.scope
          const graphScope = yield* Scope.fork(scope)
          const graph = yield* Layer.buildWithScope(AppLayer, graphScope)
          const app = yield* ApplicationBlock.get.pipe(
            Effect.provideContext(graph),
          )
          const room = yield* ChatRoomContract.get.pipe(
            Effect.provideContext(graph),
          )
          const raw = acquisitionOf(app).block
          const rawRoom = acquisitionOf(room).block
          const rawBindings = runtimeBindingsOf(raw)
          const general = Option.getOrThrow(
            Array.findFirst(
              rawBindings,
              binding => binding.placement === 'general',
            ),
          )
          const random = Option.getOrThrow(
            Array.findFirst(
              rawBindings,
              binding => binding.placement === 'random',
            ),
          )
          const rooms = Option.getOrThrow(
            Array.findFirst(
              rawBindings,
              binding => binding.placement === 'rooms',
            ),
          )
          const composer = Option.getOrThrow(
            Array.head(runtimeBindingsOf(rawRoom)),
          )
          const initial = app.init().model
          const keyedInitial = room.init({
            title: 'Keyed',
            inputId: 'keyed',
          }).model
          const model = modifyFields(initial, {
            general: model =>
              modifyFields(model, {
                connection: () => ConnectionState.Connecting(),
              }),
            random: model =>
              modifyFields(model, {
                connection: () => ConnectionState.Connecting(),
              }),
            rooms: () => ({
              keyed: modifyFields(keyedInitial, {
                connection: () => ConnectionState.Connecting(),
              }),
            }),
          })
          const provider = yield* makeResourceProvider({
            managedResources: lowerBlock(raw).managedResources,
            runtimeScope: scope,
            maybePortChannels: Option.none(),
            applicationLayer: qualifyLayer(raw.owner.id, raw.EffectsLayer),
          }).pipe(
            Effect.provideService(Socket.WebSocketConstructor, makeSocket),
          )
          const runtime = yield* makeCompositionRuntime({
            block: raw,
            initModel: model,
            context: Context.add(
              provider.applicationContext,
              Socket.WebSocketConstructor,
              makeSocket,
            ),
            runtimeScope: scope,
            enqueueMessage: () => undefined,
            crashWith: cause =>
              Effect.sync(() => {
                crashes.push(String(cause))
              }),
            maybeSlowSubscriptionDependencies: Option.none(),
          })
          yield* runtime.start
          yield* Effect.promise(() =>
            expect
              .poll(() => ({ sockets: sockets.length, crashes }))
              .toEqual({ sockets: 3, crashes: [] }),
          )
          const connectedModel = modifyFields(model, {
            general: model =>
              modifyFields(model, {
                connection: () => ConnectionState.Connected(),
              }),
            random: model =>
              modifyFields(model, {
                connection: () => ConnectionState.Connected(),
              }),
            rooms: rooms =>
              Object.fromEntries(
                Object.entries(rooms).map(([key, model]) => [
                  key,
                  modifyFields(model, {
                    connection: () => ConnectionState.Connected(),
                  }),
                ]),
              ),
          })
          runtime.synchronize(connectedModel)
          yield* Effect.promise(() =>
            expect
              .poll(() => sockets.map(socket => socket.listenerCount()))
              .toEqual([3, 3, 3]),
          )

          const occurrence = (binding: typeof general, key?: string) => {
            const frame = { binding, ...(key === undefined ? {} : { key }) }
            const captured = runtime.capture({
              [CommandInstancesTypeId]: [frame],
            })

            if (captured === undefined) {
              throw new Error('Expected an active occurrence')
            }

            return <A, E, R>(effect: Effect.Effect<A, E, R>) =>
              qualifyEffect(
                raw.owner.id,
                qualifyEffect(binding.placement, effect, frame),
              ).pipe(
                Effect.provideContext(
                  Context.makeUnsafe<
                    ReturnType<
                      typeof qualifyEffect<string, A, E, R>
                    > extends Effect.Effect<
                      unknown,
                      unknown,
                      infer Requirements
                    >
                      ? Requirements
                      : never
                  >(captured.context.mapUnsafe),
                ),
              )
          }
          const inGeneral = occurrence(general)
          const inRandom = occurrence(random)
          const inKeyed = occurrence(rooms, 'keyed')
          const generalSocket = yield* inGeneral(ChatSocket.get)
          const randomSocket = yield* inRandom(ChatSocket.get)
          const keyed = yield* inKeyed(ChatSocket.get)
          keyedSocket = sockets.find(socket => socket === keyed)
          expect(generalSocket).not.toBe(randomSocket)
          expect(keyed).not.toBe(generalSocket)

          const memoMap = yield* Layer.makeMemoMap
          const beforeBuild = yield* Effect.context<never>()
          expect(
            Array.filter(
              Array.fromIterable(beforeBuild.mapUnsafe.keys()),
              isResourceKey,
            ),
          ).toEqual([])
          expect(Context.get(beforeBuild, CurrentInstance)).toBeUndefined()
          const generalExecution = yield* Layer.buildWithMemoMap(
            room.EffectsLayer,
            memoMap,
            scope,
          ).pipe(Effect.provideService(Socket.WebSocketConstructor, makeSocket))
          const randomExecution = yield* inRandom(
            Layer.buildWithMemoMap(room.EffectsLayer, memoMap, scope),
          )
          const keyedExecution = yield* inKeyed(
            Layer.buildWithMemoMap(room.EffectsLayer, memoMap, scope),
          )
          const sharedExecution = Option.getOrThrow(
            Array.head(Array.fromIterable(generalExecution.mapUnsafe.values())),
          )
          expect(
            Option.getOrThrow(
              Array.head(
                Array.fromIterable(randomExecution.mapUnsafe.values()),
              ),
            ),
          ).toBe(sharedExecution)
          expect(
            Option.getOrThrow(
              Array.head(Array.fromIterable(keyedExecution.mapUnsafe.values())),
            ),
          ).toBe(sharedExecution)

          const send = (roomModel: typeof initial.general, text: string) => {
            const changed = Reflect.apply(room.update, undefined, [
              roomModel,
              Reflect.apply(toParentMessage, undefined, [
                composer,
                ComposerMessage.UpdatedText({ value: text }),
              ]),
            ])
            const submitted = Reflect.apply(room.update, undefined, [
              changed.model,
              Reflect.apply(toParentMessage, undefined, [
                composer,
                ComposerMessage.SubmittedForm(),
              ]),
            ])

            return Option.getOrThrow(Array.head(submitted.commands))
          }
          const generalSend = send(model.general, 'General')
          const randomSend = send(model.random, 'Random')
          const keyedSend = send(keyedInitial, 'Keyed')
          yield* inGeneral(
            generalSend.effect.pipe(Effect.provideContext(generalExecution)),
          )
          yield* inRandom(
            randomSend.effect.pipe(Effect.provideContext(randomExecution)),
          )
          yield* inKeyed(
            keyedSend.effect.pipe(Effect.provideContext(keyedExecution)),
          )
          expect(sockets.map(socket => socket.sent)).toEqual([
            ['General'],
            ['Random'],
            ['Keyed'],
          ])

          const generalContext = yield* inGeneral(Effect.context<never>())
          const randomContext = yield* inRandom(Effect.context<never>())
          const opaqueOnly = Context.makeUnsafe(
            new Map(
              Array.filter(
                Array.fromIterable(generalContext.mapUnsafe),
                ([key]) => key.startsWith('foldkit/RuntimeCapability/'),
              ),
            ),
          )
          expect(opaqueOnly.mapUnsafe.has(ChatSocket._tag.key)).toBe(false)
          expect(Context.get(opaqueOnly, CurrentInstance)).toBeUndefined()
          yield* generalSend.effect.pipe(
            Effect.provideContext(Context.merge(opaqueOnly, generalExecution)),
          )
          expect(sockets.map(socket => socket.sent)).toEqual([
            ['General', 'General'],
            ['Random'],
            ['Keyed'],
          ])
          const wrongAuthority = Context.makeUnsafe(
            new Map([
              ...randomContext.mapUnsafe,
              ...Array.filter(
                Array.fromIterable(generalContext.mapUnsafe),
                ([key]) => key.startsWith('foldkit/RuntimeCapability/'),
              ),
            ]),
          )
          const wrong = yield* Effect.exit(
            randomSend.effect.pipe(
              Effect.provideContext(
                Context.merge(
                  Context.merge(randomContext, randomExecution),
                  wrongAuthority,
                ),
              ),
            ),
          )
          expect(Exit.isFailure(wrong)).toBe(true)
          expect(String(wrong)).toContain('matching active Runtime occurrence')

          const otherGraph = yield* Layer.build(
            ChatRoomWithComposerBlock.provide(Layer.empty).layer,
          )
          const otherRoom = yield* ChatRoomContract.get.pipe(
            Effect.provideContext(otherGraph),
          )
          expect(acquisitionOf(otherRoom).block).not.toBe(rawRoom)
          const otherExecution = yield* Layer.build(
            otherRoom.EffectsLayer,
          ).pipe(Effect.provideService(Socket.WebSocketConstructor, makeSocket))
          const otherReceived = otherRoom.update(
            otherRoom.init({ title: 'Other', inputId: 'other' }).model,
            Message.ReceivedMessage({ text: 'Other' }),
          )
          const otherCommand = Option.getOrThrow(
            Array.head(otherReceived.commands ?? []),
          )
          const wrongImplementation = yield* Effect.exit(
            inGeneral(
              otherCommand.effect.pipe(Effect.provideContext(otherExecution)),
            ),
          )
          expect(Exit.isFailure(wrongImplementation)).toBe(true)
          expect(String(wrongImplementation)).toContain(
            'matching active Runtime occurrence',
          )

          runtime.synchronize(
            modifyFields(connectedModel, { rooms: () => ({}) }),
          )
          yield* Effect.promise(() =>
            expect.poll(() => keyedSocket?.closeCount).toBe(1),
          )
          const retired = yield* Effect.exit(
            inKeyed(
              keyedSend.effect.pipe(Effect.provideContext(keyedExecution)),
            ),
          )
          expect(Exit.isFailure(retired)).toBe(true)
          expect(String(retired)).toContain(
            'matching active Runtime occurrence',
          )
          expect(
            sockets.filter(socket => socket.closeCount === 0),
          ).toHaveLength(2)

          yield* Scope.close(graphScope, Exit.void)
          const closedAcquisition = yield* Effect.exit(
            inGeneral(
              generalSend.effect.pipe(Effect.provideContext(generalExecution)),
            ),
          )
          expect(Exit.isFailure(closedAcquisition)).toBe(true)
          expect(String(closedAcquisition)).toContain(
            'matching active Runtime occurrence',
          )

          expect(() =>
            declareRuntimeCapability(rawRoom, rawRoom.owner),
          ).toThrow('fresh implementation acquisition')
          expect(runtimeBindingOf(general).block).toBe(rawRoom)
          expect(Context.get(randomContext, CurrentInstance)?.node).not.toBe(
            Context.get(generalContext, CurrentInstance)?.node,
          )
        }),
      ),
    )

    expect(sockets.map(socket => socket.closeCount)).toEqual([1, 1, 1])
    expect(sockets.map(socket => socket.listenerCount())).toEqual([0, 0, 0])
  })
})
