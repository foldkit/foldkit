import {
  Array,
  type Cause,
  Console,
  Data,
  Deferred,
  Duration,
  Effect,
  Exit,
  HashMap,
  HashSet,
  Match,
  Option,
  Predicate,
  Ref,
  Result,
  Schema,
  Scope,
  Semaphore,
  String,
  pipe,
} from 'effect'
import {
  Request,
  RequestFrame,
  type Response,
  ResponseFrame,
  type RuntimeInfo,
} from 'foldkit/devtools-protocol'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { type RawData, WebSocket } from 'ws'

import type { RelayTarget } from './relayLocation.js'

const REQUEST_TIMEOUT = Duration.seconds(10)
const CONNECT_TIMEOUT = Duration.seconds(2)
const LIST_RUNTIMES_TIMEOUT = Duration.seconds(2)

const NOT_CONNECTED_REASON =
  'Not connected to a Foldkit dev server. Start your Foldkit Vite dev server and retry the tool call.'
const NO_RUNTIMES_REASON =
  'No connected Foldkit runtimes. Open a Foldkit dev page and try again.'
const INVALID_ADDRESS_REASON = 'the relay address is not a valid URL'
const UNVERIFIED_RELAY_REASON = 'the relay could not prove its identity'
const CLOSED_REASON = 'The Foldkit relay client is closed.'
const RELAY_TOKEN_PARAMETER = 'token'
const RELAY_CHALLENGE_HEADER = 'X-Foldkit-Relay-Challenge'
const RELAY_CLIENT_PROOF_HEADER = 'X-Foldkit-Relay-Client-Proof'
const RELAY_SERVER_PROOF_HEADER = 'x-foldkit-relay-server-proof'
const RELAY_TOKEN_PATTERN = /^[0-9a-f]{64}$/
const RELAY_PROOF_PATTERN = /^[0-9a-f]{64}$/
const RELAY_CHALLENGE_BYTES = 32

const encodeRequestFrameToJson = Schema.encodeUnknownSync(
  Schema.fromJsonString(RequestFrame),
)

type PendingResponses = HashMap.HashMap<
  string,
  Deferred.Deferred<Response, Error>
>

type RelaySocket = Readonly<{
  socket: WebSocket
  target: RelayTarget
}>

type RelayListing = Readonly<{
  relaySocket: RelaySocket
  runtimes: ReadonlyArray<RuntimeInfo>
}>

type RuntimeRoute = Readonly<{
  socket: WebSocket
  connectionId: string
}>

type Refresh = Deferred.Deferred<ReadonlyArray<RelaySocket>>

type RefreshTurn = Data.TaggedEnum<{
  Leader: { refresh: Refresh }
  Follower: { refresh: Refresh }
}>
const RefreshTurn = Data.taggedEnum<RefreshTurn>()

export type ListedRuntime = Readonly<{
  runtime: RuntimeInfo
  maybeProjectRoot: Option.Option<string>
}>

/**
 * Connects MCP tool calls to the DevTools relays for a project.
 *
 * Each call checks the registry, connects to matching relays, and lists their
 * Runtimes before routing a request. It closes connections to relays that are
 * no longer published. Concurrent calls share one registry lookup. A dev server
 * started or restarted after the previous call is reached on the next one.
 *
 * `listRuntimes` returns Runtimes from every connected relay, oldest dev server
 * first. `sendRequest` uses the newest relay that lists the requested Runtime.
 * Without an id, it uses the most recently connected Runtime of the most
 * recently started dev server. An id that no relay lists returns an error
 * without waiting for the request timeout.
 *
 * Cancelling one call leaves shared discovery available to other calls. `close`
 * interrupts discovery, closes the relay connections, and fails pending
 * requests.
 */
export type RelayClient = Readonly<{
  listRuntimes: Effect.Effect<ReadonlyArray<ListedRuntime>, Error>
  sendRequest: (
    request: Request,
    maybeRuntimeId: Option.Option<string>,
  ) => Effect.Effect<Response, Cause.TimeoutError | Error>
  close: Effect.Effect<void>
}>

const generateRequestId = (): string =>
  `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

const parseUrl = Option.liftThrowable((url: string) => new URL(url))

const relayUrlForLog = (url: string): string =>
  Option.match(parseUrl(url), {
    onNone: () => Array.headNonEmpty(String.split(url, '?')),
    onSome: parsed => {
      parsed.search = ''

      return parsed.toString()
    },
  })

/**
 * Returns an error message for display. Effect's `TimeoutError` has no
 * `message`, so its string form is used instead.
 */
export const errorReason = (error: Error): string =>
  error.message ? error.message : globalThis.String(error)

const toError =
  (description: string) =>
  (cause: unknown): Error =>
    cause instanceof Error
      ? cause
      : new Error(`${description}: ${globalThis.String(cause)}`)

const computeRelayProof = (
  token: string,
  role: 'client' | 'server',
  challenge: string,
): string =>
  createHmac('sha256', token).update(`${role}:${challenge}`).digest('hex')

const attemptOpen = (url: string): Effect.Effect<WebSocket, Error> =>
  Effect.suspend(() =>
    Option.match(parseUrl(url), {
      onNone: () => Effect.fail(new Error(INVALID_ADDRESS_REASON)),
      onSome: parsedUrl => {
        const maybeToken = Option.fromNullishOr(
          parsedUrl.searchParams.get(RELAY_TOKEN_PARAMETER),
        )

        if (
          Option.isSome(maybeToken) &&
          !RELAY_TOKEN_PATTERN.test(maybeToken.value)
        ) {
          return Effect.fail(new Error(INVALID_ADDRESS_REASON))
        }

        const maybeChallenge = Option.map(maybeToken, () =>
          randomBytes(RELAY_CHALLENGE_BYTES).toString('hex'),
        )
        parsedUrl.searchParams.delete(RELAY_TOKEN_PARAMETER)

        return Effect.callback<WebSocket, Error>(resume => {
          const constructed = Result.try({
            try: () =>
              Option.match(Option.all([maybeToken, maybeChallenge]), {
                onNone: () => new WebSocket(parsedUrl),
                onSome: ([token, challenge]) =>
                  new WebSocket(parsedUrl, {
                    headers: {
                      [RELAY_CHALLENGE_HEADER]: challenge,
                      [RELAY_CLIENT_PROOF_HEADER]: computeRelayProof(
                        token,
                        'client',
                        challenge,
                      ),
                    },
                  }),
              }),
            catch: toError('Failed to open a connection'),
          })

          if (Result.isFailure(constructed)) {
            resume(Effect.fail(constructed.failure))
            return
          }

          const socket = constructed.success
          let isSettled = false
          let isVerified = Option.isNone(maybeToken)

          socket.once('upgrade', response => {
            if (Option.isNone(maybeToken) || Option.isNone(maybeChallenge)) {
              return
            }

            const presented = response.headers[RELAY_SERVER_PROOF_HEADER]
            const expected = Buffer.from(
              computeRelayProof(
                maybeToken.value,
                'server',
                maybeChallenge.value,
              ),
              'hex',
            )
            const isValidProof =
              Predicate.isString(presented) &&
              RELAY_PROOF_PATTERN.test(presented) &&
              timingSafeEqual(expected, Buffer.from(presented, 'hex'))

            if (isValidProof) {
              isVerified = true
            } else {
              isSettled = true
              socket.terminate()
              resume(Effect.fail(new Error(UNVERIFIED_RELAY_REASON)))
            }
          })

          socket.once('open', () => {
            if (!isVerified) {
              isSettled = true
              socket.terminate()
              resume(Effect.fail(new Error(UNVERIFIED_RELAY_REASON)))
              return
            }

            isSettled = true
            resume(Effect.succeed(socket))
          })
          socket.on('error', error => {
            if (!isSettled) {
              isSettled = true
              resume(Effect.fail(error))
            }
          })

          return Effect.sync(() => {
            isSettled = true
            socket.terminate()
          })
        })
      },
    }),
  )

const isOpen = ({ socket }: RelaySocket): boolean =>
  socket.readyState === WebSocket.OPEN

export const makeRelayClient = <Services>(
  resolveTargets: Effect.Effect<ReadonlyArray<RelayTarget>, never, Services>,
): Effect.Effect<RelayClient, never, Services> =>
  Effect.gen(function* () {
    const pendingResponsesRef = yield* Ref.make<PendingResponses>(
      HashMap.empty(),
    )
    const socketsRef = yield* Ref.make(HashMap.empty<string, RelaySocket>())
    const refreshLock = yield* Semaphore.make(1)
    const pendingRefreshRef = yield* Ref.make<Option.Option<Refresh>>(
      Option.none(),
    )
    const refreshScope = yield* Scope.make()
    const closed = yield* Deferred.make<void>()
    const context = yield* Effect.context<Services>()

    const attachHandlers = (socket: WebSocket): void => {
      socket.on('message', raw => {
        Effect.runForkWith(context)(
          handleIncomingMessage(raw, pendingResponsesRef),
        )
      })
      socket.on('error', error => {
        console.error(`[foldkit-devtools-mcp] socket error: ${error.message}`)
      })
    }

    const openTarget = (target: RelayTarget): Effect.Effect<void> =>
      Effect.uninterruptibleMask(restore =>
        restore(
          attemptOpen(target.url).pipe(
            Effect.timeoutOrElse({
              duration: CONNECT_TIMEOUT,
              orElse: () =>
                Effect.fail(
                  new Error(
                    `no connection within ${Duration.format(CONNECT_TIMEOUT)}`,
                  ),
                ),
            }),
          ),
        ).pipe(
          Effect.flatMap(socket =>
            Effect.gen(function* () {
              attachHandlers(socket)
              yield* Ref.update(
                socketsRef,
                HashMap.set(target.key, { socket, target }),
              )

              yield* Console.error(
                `[foldkit-devtools-mcp] connected to ${relayUrlForLog(target.url)}`,
              )
            }),
          ),
        ),
      ).pipe(
        Effect.catch(error =>
          Console.error(
            `[foldkit-devtools-mcp] connect attempt to ${relayUrlForLog(target.url)} failed: ${errorReason(error)}`,
          ),
        ),
      )

    const reconcile: Effect.Effect<ReadonlyArray<RelaySocket>> = Effect.gen(
      function* () {
        if (yield* Deferred.isDone(closed)) {
          return []
        }

        const targets = yield* Effect.provideContext(resolveTargets, context)
        const targetKeys = HashSet.fromIterable(
          Array.map(targets, ({ key }) => key),
        )
        const sockets = yield* Ref.get(socketsRef)

        const isKept = (relaySocket: RelaySocket, key: string): boolean =>
          HashSet.has(targetKeys, key) && isOpen(relaySocket)
        const keptSockets = HashMap.filter(sockets, isKept)
        const droppedSockets = HashMap.filter(
          sockets,
          (relaySocket, key) => !isKept(relaySocket, key),
        )

        yield* Effect.sync(() => {
          for (const { socket } of HashMap.values(droppedSockets)) {
            socket.terminate()
          }
        })
        yield* Ref.set(socketsRef, keptSockets)

        const missingTargets = Array.filter(
          targets,
          ({ key }) => !HashMap.has(keptSockets, key),
        )
        yield* Effect.forEach(missingTargets, openTarget, {
          concurrency: 'unbounded',
          discard: true,
        })

        const nextSockets = yield* Ref.get(socketsRef)

        return pipe(
          targets,
          Array.reverse,
          Array.map(({ key }) => HashMap.get(nextSockets, key)),
          Array.getSomes,
        )
      },
    )

    const takeRefreshTurn = (ownRefresh: Refresh): Effect.Effect<RefreshTurn> =>
      Ref.modify(
        pendingRefreshRef,
        (maybePendingRefresh): readonly [RefreshTurn, Option.Option<Refresh>] =>
          Option.match(maybePendingRefresh, {
            onNone: () => [
              RefreshTurn.Leader({ refresh: ownRefresh }),
              Option.some(ownRefresh),
            ],
            onSome: refresh => [
              RefreshTurn.Follower({ refresh }),
              maybePendingRefresh,
            ],
          }),
      )

    const leadRefresh = (refresh: Refresh): Effect.Effect<void> =>
      Deferred.into(
        refreshLock.withPermits(1)(
          Effect.gen(function* () {
            yield* Ref.set(pendingRefreshRef, Option.none())

            return yield* reconcile
          }),
        ),
        refresh,
      ).pipe(Effect.asVoid)

    const refreshRelays: Effect.Effect<ReadonlyArray<RelaySocket>> =
      Effect.uninterruptibleMask(restore =>
        Effect.gen(function* () {
          if (yield* Deferred.isDone(closed)) {
            return []
          }

          const ownRefresh = yield* Deferred.make<ReadonlyArray<RelaySocket>>()
          const turn = yield* takeRefreshTurn(ownRefresh)

          yield* Match.value(turn).pipe(
            Match.withReturnType<Effect.Effect<void>>(),
            Match.tagsExhaustive({
              Leader: ({ refresh }) =>
                Effect.forkIn(leadRefresh(refresh), refreshScope, {
                  startImmediately: true,
                }).pipe(Effect.asVoid),
              Follower: () => Effect.void,
            }),
          )

          return yield* restore(Deferred.await(turn.refresh))
        }),
      )

    const exchange = (
      socket: WebSocket,
      request: Request,
      maybeConnectionId: Option.Option<string>,
      timeout: Duration.Duration,
    ): Effect.Effect<Response, Cause.TimeoutError | Error> =>
      Effect.acquireUseRelease(
        Effect.gen(function* () {
          if (yield* Deferred.isDone(closed)) {
            return yield* Effect.fail(new Error(CLOSED_REASON))
          }

          const id = generateRequestId()
          const deferred = yield* Deferred.make<Response, Error>()
          yield* Ref.update(pendingResponsesRef, HashMap.set(id, deferred))

          return { id, deferred }
        }),
        ({ id, deferred }) => {
          const frame: RequestFrame = {
            id,
            maybeConnectionId,
            request,
          }

          return Effect.try({
            try: () => socket.send(encodeRequestFrameToJson(frame)),
            catch: toError('Failed to send request'),
          }).pipe(
            Effect.andThen(
              Effect.raceFirst(
                Deferred.await(deferred).pipe(Effect.timeout(timeout)),
                Deferred.await(closed).pipe(
                  Effect.andThen(Effect.fail(new Error(CLOSED_REASON))),
                ),
              ),
            ),
          )
        },
        ({ id }) => Ref.update(pendingResponsesRef, HashMap.remove(id)),
      )

    const listRelayRuntimes = ({
      socket,
      target,
    }: RelaySocket): Effect.Effect<ReadonlyArray<RuntimeInfo>> =>
      exchange(
        socket,
        Request.RequestListRuntimes(),
        Option.none(),
        LIST_RUNTIMES_TIMEOUT,
      ).pipe(
        Effect.flatMap(response =>
          Match.value(response).pipe(
            Match.withReturnType<
              Effect.Effect<ReadonlyArray<RuntimeInfo>, Error>
            >(),
            Match.tag('ResponseRuntimes', ({ runtimes }) =>
              Effect.succeed(runtimes),
            ),
            Match.tag('ResponseError', ({ reason }) =>
              Effect.fail(new Error(reason)),
            ),
            Match.orElse(({ _tag }) =>
              Effect.fail(new Error(`the relay answered ${_tag}`)),
            ),
          ),
        ),
        Effect.catch(error =>
          Console.error(
            `[foldkit-devtools-mcp] listing runtimes at ${relayUrlForLog(target.url)} failed: ${errorReason(error)}`,
          ).pipe(Effect.as([])),
        ),
      )

    const listRelays: Effect.Effect<
      ReadonlyArray<RelayListing>,
      Error
    > = Effect.gen(function* () {
      const relaySockets = yield* refreshRelays

      if (Array.isReadonlyArrayEmpty(relaySockets)) {
        return yield* Effect.fail(new Error(NOT_CONNECTED_REASON))
      }

      return yield* Effect.forEach(
        relaySockets,
        relaySocket =>
          Effect.map(listRelayRuntimes(relaySocket), runtimes => ({
            relaySocket,
            runtimes,
          })),
        { concurrency: 'unbounded' },
      )
    })

    const listRuntimes: Effect.Effect<
      ReadonlyArray<ListedRuntime>,
      Error
    > = Effect.map(listRelays, listings =>
      Array.flatMap(listings, ({ relaySocket, runtimes }) =>
        Array.map(runtimes, runtime => ({
          runtime,
          maybeProjectRoot: relaySocket.target.maybeProjectRoot,
        })),
      ),
    )

    const sendRequest = (
      request: Request,
      maybeRuntimeId: Option.Option<string>,
    ): Effect.Effect<Response, Cause.TimeoutError | Error> =>
      Effect.gen(function* () {
        const listings = yield* listRelays
        const route = yield* routeFromListings(listings, maybeRuntimeId)

        return yield* exchange(
          route.socket,
          request,
          Option.some(route.connectionId),
          REQUEST_TIMEOUT,
        )
      })

    const close: Effect.Effect<void> = Effect.uninterruptible(
      Effect.gen(function* () {
        yield* Deferred.succeed(closed, undefined)
        yield* Scope.close(refreshScope, Exit.void)
        yield* refreshLock.withPermits(1)(
          Effect.gen(function* () {
            const sockets = yield* Ref.getAndSet(socketsRef, HashMap.empty())
            yield* Effect.sync(() => {
              for (const { socket } of HashMap.values(sockets)) {
                socket.terminate()
              }
            })
          }),
        )
      }),
    )

    const client: RelayClient = { listRuntimes, sendRequest, close }

    return client
  })

const routeToRuntime = (
  listings: ReadonlyArray<RelayListing>,
  runtimeId: string,
): Effect.Effect<RuntimeRoute, Error> =>
  Option.match(
    Array.findLast(listings, ({ runtimes }) =>
      Array.some(runtimes, ({ connectionId }) => connectionId === runtimeId),
    ),
    {
      onNone: () =>
        Effect.fail(
          new Error(
            `No connected Foldkit Runtime has the id ${runtimeId}. Call foldkit_list_runtimes for the current ids.`,
          ),
        ),
      onSome: ({ relaySocket }) =>
        Effect.succeed({
          socket: relaySocket.socket,
          connectionId: runtimeId,
        }),
    },
  )

const routeToDefaultRuntime = (
  listings: ReadonlyArray<RelayListing>,
): Effect.Effect<RuntimeRoute, Error> =>
  Option.match(
    pipe(
      listings,
      Array.flatMap(({ relaySocket, runtimes }) =>
        Array.map(runtimes, ({ connectionId }) => ({
          socket: relaySocket.socket,
          connectionId,
        })),
      ),
      Array.last,
    ),
    {
      onNone: () => Effect.fail(new Error(NO_RUNTIMES_REASON)),
      onSome: Effect.succeed,
    },
  )

const routeFromListings = (
  listings: ReadonlyArray<RelayListing>,
  maybeRuntimeId: Option.Option<string>,
): Effect.Effect<RuntimeRoute, Error> =>
  Option.match(maybeRuntimeId, {
    onNone: () => routeToDefaultRuntime(listings),
    onSome: runtimeId => routeToRuntime(listings, runtimeId),
  })

const handleIncomingMessage = (
  raw: RawData,
  pendingResponsesRef: Ref.Ref<PendingResponses>,
): Effect.Effect<void> => {
  const decoded = Schema.decodeExit(Schema.fromJsonString(ResponseFrame))(
    raw.toString(),
  )

  return Exit.match(decoded, {
    onFailure: error =>
      Effect.sync(() =>
        console.error('[foldkit-devtools-mcp] failed to decode frame', error),
      ),
    onSuccess: responseFrame =>
      Effect.gen(function* () {
        const map = yield* Ref.get(pendingResponsesRef)
        const maybeDeferred = HashMap.get(map, responseFrame.id)
        yield* Option.match(maybeDeferred, {
          onNone: () => Effect.void,
          onSome: deferred =>
            Effect.gen(function* () {
              yield* Ref.update(
                pendingResponsesRef,
                HashMap.remove(responseFrame.id),
              )
              yield* Deferred.succeed(deferred, responseFrame.response)
            }),
        })
      }),
  })
}
