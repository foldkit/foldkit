import {
  Duration,
  Effect,
  Match as M,
  Option,
  Schema as S,
  Stream,
} from 'effect'
import { describe, expect, it } from 'vitest'

import * as Command from '../../command/public.js'
import * as ManagedResource from '../../managedResource/public.js'
import { m, ts } from '../../schema/index.js'
import { evo } from '../../struct/index.js'
import * as Subscription from '../../subscription/public.js'
import { define, otherwise, to, when } from './machine.js'

// REMOTE DATA

const Idle = ts('Idle')
const Loading = ts('Loading')
const Error = ts('Error', { error: S.String })
const Ok = ts('Ok', { data: S.String })

const RemoteData = S.Union([Idle, Loading, Error, Ok])
type RemoteData = typeof RemoteData.Type

const ClickedFetch = m('ClickedFetch')
const SucceededFetch = m('SucceededFetch', { data: S.String })
const FailedFetch = m('FailedFetch', { error: S.String })
const ClickedRetry = m('ClickedRetry')

const RemoteDataMessage = S.Union([
  ClickedFetch,
  SucceededFetch,
  FailedFetch,
  ClickedRetry,
])
type RemoteDataMessage = typeof RemoteDataMessage.Type

const remoteDataMachine = define({
  state: RemoteData,
  message: RemoteDataMessage,
})({
  initial: Idle(),
  states: {
    Idle: {
      on: {
        ClickedFetch: to('Loading', () => Loading()),
      },
    },
    Loading: {
      on: {
        SucceededFetch: to('Ok', ({ message }) => Ok({ data: message.data })),
        FailedFetch: to('Error', ({ message }) =>
          Error({ error: message.error }),
        ),
      },
    },
    Error: {
      on: {
        ClickedRetry: to('Loading', () => Loading()),
      },
    },
    Ok: {
      on: {
        ClickedFetch: to('Loading', () => Loading()),
      },
    },
  },
})

// CONNECTION

const MAX_CONNECT_ATTEMPTS = 5
const BASE_BACKOFF_DELAY_MILLIS = 250

const backoffDelayMillis = (attemptCount: number): number =>
  BASE_BACKOFF_DELAY_MILLIS * 2 ** (attemptCount - 1)

const Disconnected = ts('Disconnected')
const Connecting = ts('Connecting', { attemptCount: S.Number })
const Connected = ts('Connected', { sessionId: S.String })
const Reconnecting = ts('Reconnecting', {
  attemptCount: S.Number,
  delayMillis: S.Number,
})
const Failed = ts('Failed', { attemptCount: S.Number, reason: S.String })
const Suspended = ts('Suspended')

const ConnectionState = S.Union([
  Disconnected,
  Connecting,
  Connected,
  Reconnecting,
  Failed,
  Suspended,
])
type ConnectionState = typeof ConnectionState.Type

const ClickedConnect = m('ClickedConnect')
const ClickedDisconnect = m('ClickedDisconnect')
const SocketOpened = m('SocketOpened', { sessionId: S.String })
const SocketErrored = m('SocketErrored', { reason: S.String })
const SocketClosed = m('SocketClosed', { reason: S.String })
const TimedOutBackoff = m('TimedOutBackoff')
const ReleasedSocket = m('ReleasedSocket')
const CompletedLogTransition = m('CompletedLogTransition')

const ConnectionMessage = S.Union([
  ClickedConnect,
  ClickedDisconnect,
  SocketOpened,
  SocketErrored,
  SocketClosed,
  TimedOutBackoff,
  ReleasedSocket,
  CompletedLogTransition,
])
type ConnectionMessage = typeof ConnectionMessage.Type
type ConnectingState = typeof Connecting.Type
type SocketErroredMessage = typeof SocketErrored.Type

const connectingToMaybeBackoff = (
  state: ConnectingState,
): Option.Option<Readonly<{ delayMillis: number }>> =>
  state.attemptCount < MAX_CONNECT_ATTEMPTS
    ? Option.some({ delayMillis: backoffDelayMillis(state.attemptCount) })
    : Option.none()

const connectingToMaybeSocketErrorTags = (
  state: ConnectingState,
  message: SocketErroredMessage,
): Option.Option<
  Readonly<{ sourceTag: 'Connecting'; messageTag: 'SocketErrored' }>
> => Option.some({ sourceTag: state._tag, messageTag: message._tag })

const connectingToMaybeNextAttempt = (
  state: ConnectingState,
): Option.Option<Readonly<{ nextAttemptCount: number }>> =>
  state.attemptCount < MAX_CONNECT_ATTEMPTS
    ? Option.some({ nextAttemptCount: state.attemptCount + 1 })
    : Option.none()

const LogTransition = Command.define(
  'LogTransition',
  { description: S.String },
  CompletedLogTransition,
)(() => Effect.succeed(CompletedLogTransition()))

const connectionMachine = define({
  state: ConnectionState,
  message: ConnectionMessage,
})({
  initial: Disconnected(),
  states: {
    Disconnected: {
      on: {
        ClickedConnect: to('Connecting', () => Connecting({ attemptCount: 1 })),
      },
    },
    Connecting: {
      on: {
        SocketOpened: to(
          'Connected',
          ({ message }) => Connected({ sessionId: message.sessionId }),
          ({ message }) => [
            LogTransition({
              description: `Opened session ${message.sessionId}`,
            }),
          ],
        ),
        SocketErrored: [
          when(
            connectingToMaybeBackoff,
            'Reconnecting',
            ({ state, guardValue }) =>
              Reconnecting({
                attemptCount: state.attemptCount,
                delayMillis: guardValue.delayMillis,
              }),
          ),
          otherwise(
            to('Failed', ({ state, message }) =>
              Failed({
                attemptCount: state.attemptCount,
                reason: message.reason,
              }),
            ),
          ),
        ],
      },
    },
    Connected: {
      on: {
        SocketClosed: to('Reconnecting', () =>
          Reconnecting({
            attemptCount: 1,
            delayMillis: backoffDelayMillis(1),
          }),
        ),
        ClickedDisconnect: to('Disconnected', () => Disconnected()),
      },
    },
    Reconnecting: {
      on: {
        TimedOutBackoff: to('Connecting', ({ state }) =>
          Connecting({ attemptCount: state.attemptCount + 1 }),
        ),
        ClickedDisconnect: to('Disconnected', () => Disconnected()),
      },
    },
    Failed: {
      on: {
        ClickedConnect: to('Connecting', () => Connecting({ attemptCount: 1 })),
      },
    },
    Suspended: {
      on: {
        ClickedConnect: to('Connecting', () => Connecting({ attemptCount: 1 })),
      },
    },
  },
})

// INTEGRATION

const AppModel = S.Struct({
  connection: ConnectionState,
  isDebugPanelOpen: S.Boolean,
})
type AppModel = typeof AppModel.Type

type AppUpdateReturn = [
  AppModel,
  ReadonlyArray<Command.Command<ConnectionMessage>>,
]
const withAppUpdateReturn = M.withReturnType<AppUpdateReturn>()

const update = (model: AppModel, message: ConnectionMessage): AppUpdateReturn =>
  M.value(message).pipe(
    withAppUpdateReturn,
    M.tag(
      'ClickedConnect',
      'ClickedDisconnect',
      'SocketOpened',
      'SocketErrored',
      'SocketClosed',
      'TimedOutBackoff',
      connectionMessage => {
        const [nextConnection, commands] = connectionMachine.transition(
          model.connection,
          connectionMessage,
        )
        return [evo(model, { connection: () => nextConnection }), commands]
      },
    ),
    M.tag('ReleasedSocket', 'CompletedLogTransition', () => [model, []]),
    M.exhaustive,
  )

// The Machine owns transitions only. Lifecycle effects stay in ordinary
// primitives gated on the state tag. The socket is a ManagedResource that
// exists while the Machine is in Connecting or Connected; its lifecycle
// Messages feed the Machine: a successful open dispatches SocketOpened
// (Connecting to Connected) and a failed open dispatches SocketErrored,
// which drives the reconnect-or-fail guard.

const SOCKET_URL = 'wss://example.test/socket'

const Socket = ManagedResource.tag<WebSocket>()('Socket')

const managedResources = ManagedResource.make<AppModel, ConnectionMessage>()(
  entry => ({
    socket: entry(S.Option(S.Null), {
      resource: Socket,
      modelToMaybeRequirements: model =>
        M.value(model.connection).pipe(
          M.tag('Connecting', 'Connected', () => Option.some(null)),
          M.orElse(() => Option.none()),
        ),
      acquire: () =>
        Effect.callback<WebSocket, string>(resume => {
          const socket = new WebSocket(SOCKET_URL)
          socket.addEventListener('open', () => resume(Effect.succeed(socket)))
          socket.addEventListener('error', () =>
            resume(Effect.fail('Socket failed to open')),
          )
        }),
      release: socket => Effect.sync(() => socket.close()),
      onAcquired: socket => SocketOpened({ sessionId: socket.url }),
      onReleased: () => ReleasedSocket(),
      onAcquireError: error => SocketErrored({ reason: String(error) }),
    }),
  }),
)

// The backoff timer is a Subscription gated on the Reconnecting tag: the
// Stream sleeps for the state's delayMillis, emits TimedOutBackoff (driving
// Reconnecting back to Connecting), and tears down whenever the Machine
// leaves Reconnecting.

const subscriptions = Subscription.make<AppModel, ConnectionMessage>()(
  entry => ({
    backoffTimer: entry(
      { maybeDelayMillis: S.Option(S.Number) },
      {
        modelToDependencies: model => ({
          maybeDelayMillis: M.value(model.connection).pipe(
            M.tag('Reconnecting', ({ delayMillis }) =>
              Option.some(delayMillis),
            ),
            M.orElse(() => Option.none()),
          ),
        }),
        dependenciesToStream: ({ maybeDelayMillis }) =>
          Option.match(maybeDelayMillis, {
            onNone: () => Stream.empty,
            onSome: delayMillis =>
              Stream.fromEffect(
                Effect.as(
                  Effect.sleep(Duration.millis(delayMillis)),
                  TimedOutBackoff(),
                ),
              ),
          }),
      },
    ),
  }),
)

// TYPE-LEVEL GUARANTEES

const narrowingMachine = define({
  state: ConnectionState,
  message: ConnectionMessage,
})({
  initial: Disconnected(),
  states: {
    Connecting: {
      on: {
        SocketErrored: [
          when(
            connectingToMaybeSocketErrorTags,
            'Failed',
            ({ state, message, guardValue }) => {
              const sourceTag: 'Connecting' = guardValue.sourceTag
              const messageTag: 'SocketErrored' = guardValue.messageTag

              return Failed({
                attemptCount: state.attemptCount,
                reason: `${sourceTag} ${messageTag} ${message.reason}`,
              })
            },
          ),
        ],
      },
    },
  },
})

const guardValueMachine = define({
  state: ConnectionState,
  message: ConnectionMessage,
})({
  initial: Disconnected(),
  states: {
    Connecting: {
      on: {
        SocketErrored: [
          when(
            connectingToMaybeNextAttempt,
            'Reconnecting',
            ({ state, guardValue }) =>
              Reconnecting({
                attemptCount: guardValue.nextAttemptCount,
                delayMillis: backoffDelayMillis(state.attemptCount),
              }),
          ),
        ],
      },
    },
  },
})

const booleanGuardMachine = define({
  state: ConnectionState,
  message: ConnectionMessage,
})({
  initial: Disconnected(),
  states: {
    Connecting: {
      on: {
        SocketErrored: [
          when(
            state => state.attemptCount < MAX_CONNECT_ATTEMPTS,
            'Reconnecting',
            ({ state }) =>
              Reconnecting({
                attemptCount: state.attemptCount,
                delayMillis: backoffDelayMillis(state.attemptCount),
              }),
          ),
          otherwise(
            to('Failed', ({ state, message }) =>
              Failed({
                attemptCount: state.attemptCount,
                reason: message.reason,
              }),
            ),
          ),
        ],
      },
    },
  },
})

const wrongVariantMachine = define({
  state: RemoteData,
  message: RemoteDataMessage,
})({
  initial: Idle(),
  states: {
    Idle: {
      on: {
        // @ts-expect-error the build function must return the Loading variant named by the target tag
        ClickedFetch: to('Loading', () => Idle()),
      },
    },
  },
})

const wrongTargetTagMachine = define({
  state: RemoteData,
  message: RemoteDataMessage,
})({
  initial: Idle(),
  states: {
    Idle: {
      on: {
        // @ts-expect-error 'Loadingg' is not a state tag
        ClickedFetch: to('Loadingg', () => Loading()),
      },
    },
  },
})

const unknownStateTagMachine = define({
  state: RemoteData,
  message: RemoteDataMessage,
})({
  initial: Idle(),
  states: {
    // @ts-expect-error 'Idl' is not a state tag
    Idl: {
      on: {},
    },
  },
})

const unknownMessageTagMachine = define({
  state: RemoteData,
  message: RemoteDataMessage,
})({
  initial: Idle(),
  states: {
    Idle: {
      on: {
        // @ts-expect-error 'ClickedFetchh' is not a Message tag
        ClickedFetchh: to('Loading', () => Loading()),
      },
    },
  },
})

const shadowedGuardMachine = define({
  state: RemoteData,
  message: RemoteDataMessage,
})({
  initial: Idle(),
  states: {
    Idle: {
      on: {
        ClickedFetch: [
          otherwise(to('Loading', () => Loading())),
          when(
            (_state, message) => Option.some(message),
            'Ok',
            () => Ok({ data: 'unreachable' }),
          ),
        ],
      },
    },
  },
})

const PlainIdle = S.Struct({ _tag: S.Literal('PlainIdle') })
const PlainActive = S.Struct({ _tag: S.Literal('PlainActive') })

const PlainState = S.Union([PlainIdle, PlainActive])
type PlainState = typeof PlainState.Type

const plainTagMachine = define({
  state: PlainState,
  message: RemoteDataMessage,
})({
  initial: { _tag: 'PlainIdle' },
  states: {
    PlainIdle: {
      on: {
        ClickedFetch: to('PlainActive', () => ({ _tag: 'PlainActive' })),
      },
    },
  },
})

// TESTS

describe('remote data machine', () => {
  it('starts at the initial state with the full tag set from the Schema', () => {
    expect(remoteDataMachine.initial).toStrictEqual(Idle())
    expect(remoteDataMachine.stateTags).toEqual([
      'Idle',
      'Loading',
      'Error',
      'Ok',
    ])
  })

  it('transitions along the obvious edges', () => {
    const [loading] = remoteDataMachine.transition(Idle(), ClickedFetch())
    expect(loading).toStrictEqual(Loading())

    const [ok] = remoteDataMachine.transition(
      Loading(),
      SucceededFetch({ data: 'payload' }),
    )
    expect(ok).toStrictEqual(Ok({ data: 'payload' }))

    const [errored] = remoteDataMachine.transition(
      Loading(),
      FailedFetch({ error: 'boom' }),
    )
    expect(errored).toStrictEqual(Error({ error: 'boom' }))

    const [retrying] = remoteDataMachine.transition(
      Error({ error: 'boom' }),
      ClickedRetry(),
    )
    expect(retrying).toStrictEqual(Loading())
  })

  it('reports unmatched messages as Ignored without changing state', () => {
    const idle = Idle()
    const result = remoteDataMachine.step(idle, ClickedRetry())

    expect(result).toEqual({
      _tag: 'Ignored',
      stateTag: 'Idle',
      messageTag: 'ClickedRetry',
      state: Idle(),
    })

    const [unchanged, commands] = remoteDataMachine.transition(
      idle,
      ClickedRetry(),
    )
    expect(unchanged).toBe(idle)
    expect(commands).toEqual([])
  })

  it('exposes the edge set as data', () => {
    expect(remoteDataMachine.edges).toEqual([
      {
        from: 'Idle',
        messageTag: 'ClickedFetch',
        target: 'Loading',
        guard: { _tag: 'Unguarded' },
      },
      {
        from: 'Loading',
        messageTag: 'SucceededFetch',
        target: 'Ok',
        guard: { _tag: 'Unguarded' },
      },
      {
        from: 'Loading',
        messageTag: 'FailedFetch',
        target: 'Error',
        guard: { _tag: 'Unguarded' },
      },
      {
        from: 'Error',
        messageTag: 'ClickedRetry',
        target: 'Loading',
        guard: { _tag: 'Unguarded' },
      },
      {
        from: 'Ok',
        messageTag: 'ClickedFetch',
        target: 'Loading',
        guard: { _tag: 'Unguarded' },
      },
    ])
  })

  it('finds every state reachable from Idle', () => {
    const reachable = remoteDataMachine.reachableFrom('Idle')
    expect(reachable).toEqual(new Set(['Idle', 'Loading', 'Error', 'Ok']))
    expect(remoteDataMachine.unreachableStates()).toEqual([])
    expect(remoteDataMachine.deadTransitions()).toEqual([])
  })

  it('emits a Mermaid state diagram', () => {
    expect(remoteDataMachine.toMermaid()).toBe(
      [
        'stateDiagram-v2',
        '  Idle',
        '  Loading',
        '  Error',
        '  Ok',
        '  [*] --> Idle',
        '  Idle --> Loading: ClickedFetch',
        '  Loading --> Ok: SucceededFetch',
        '  Loading --> Error: FailedFetch',
        '  Error --> Loading: ClickedRetry',
        '  Ok --> Loading: ClickedFetch',
      ].join('\n'),
    )
  })
})

describe('connection machine', () => {
  it('walks the happy path and emits the edge command', () => {
    const [connecting] = connectionMachine.transition(
      Disconnected(),
      ClickedConnect(),
    )
    expect(connecting).toStrictEqual(Connecting({ attemptCount: 1 }))

    const result = connectionMachine.step(
      Connecting({ attemptCount: 1 }),
      SocketOpened({ sessionId: 'abc' }),
    )
    expect(result._tag).toBe('Transitioned')

    if (result._tag === 'Transitioned') {
      expect(result.from).toBe('Connecting')
      expect(result.target).toBe('Connected')
      expect(result.state).toStrictEqual(Connected({ sessionId: 'abc' }))

      const commandNames = result.commands.map(command => command.name)
      expect(commandNames).toEqual(['LogTransition'])

      const commandResults = result.commands.map(command =>
        Effect.runSync(command.effect),
      )
      expect(commandResults).toEqual([CompletedLogTransition()])
    }
  })

  it('reconnects with exponential backoff below the attempt limit', () => {
    const [reconnecting] = connectionMachine.transition(
      Connecting({ attemptCount: 4 }),
      SocketErrored({ reason: 'boom' }),
    )
    expect(reconnecting).toStrictEqual(
      Reconnecting({ attemptCount: 4, delayMillis: 2000 }),
    )

    const [connectingAgain] = connectionMachine.transition(
      Reconnecting({ attemptCount: 4, delayMillis: 2000 }),
      TimedOutBackoff(),
    )
    expect(connectingAgain).toStrictEqual(Connecting({ attemptCount: 5 }))
  })

  it('fails at the attempt limit via the otherwise guard', () => {
    const [failed] = connectionMachine.transition(
      Connecting({ attemptCount: 5 }),
      SocketErrored({ reason: 'boom' }),
    )
    expect(failed).toStrictEqual(Failed({ attemptCount: 5, reason: 'boom' }))
  })

  it('ignores messages with no edge from the current state', () => {
    const result = connectionMachine.step(Disconnected(), TimedOutBackoff())
    expect(result).toEqual({
      _tag: 'Ignored',
      stateTag: 'Disconnected',
      messageTag: 'TimedOutBackoff',
      state: Disconnected(),
    })
  })

  it('reports Suspended as unreachable and its edge as dead', () => {
    const reachable = connectionMachine.reachableFrom('Disconnected')
    expect(reachable).toEqual(
      new Set([
        'Disconnected',
        'Connecting',
        'Connected',
        'Reconnecting',
        'Failed',
      ]),
    )

    expect(connectionMachine.unreachableStates()).toEqual(['Suspended'])

    expect(connectionMachine.deadTransitions()).toEqual([
      {
        edge: {
          from: 'Suspended',
          messageTag: 'ClickedConnect',
          target: 'Connecting',
          guard: { _tag: 'Unguarded' },
        },
        reason: 'UnreachableSource',
      },
    ])
  })

  it('emits a Mermaid state diagram with guard labels', () => {
    expect(connectionMachine.toMermaid()).toBe(
      [
        'stateDiagram-v2',
        '  Disconnected',
        '  Connecting',
        '  Connected',
        '  Reconnecting',
        '  Failed',
        '  Suspended',
        '  [*] --> Disconnected',
        '  Disconnected --> Connecting: ClickedConnect',
        '  Connecting --> Connected: SocketOpened',
        '  Connecting --> Reconnecting: SocketErrored [when 1]',
        '  Connecting --> Failed: SocketErrored [otherwise]',
        '  Connected --> Reconnecting: SocketClosed',
        '  Connected --> Disconnected: ClickedDisconnect',
        '  Reconnecting --> Connecting: TimedOutBackoff',
        '  Reconnecting --> Disconnected: ClickedDisconnect',
        '  Failed --> Connecting: ClickedConnect',
        '  Suspended --> Connecting: ClickedConnect',
      ].join('\n'),
    )
  })
})

describe('guard lists', () => {
  it('fires a boolean guard on true and falls through to otherwise on false', () => {
    const [reconnecting] = booleanGuardMachine.transition(
      Connecting({ attemptCount: 2 }),
      SocketErrored({ reason: 'boom' }),
    )
    expect(reconnecting).toStrictEqual(
      Reconnecting({ attemptCount: 2, delayMillis: 500 }),
    )

    const [failed] = booleanGuardMachine.transition(
      Connecting({ attemptCount: MAX_CONNECT_ATTEMPTS }),
      SocketErrored({ reason: 'boom' }),
    )
    expect(failed).toStrictEqual(
      Failed({ attemptCount: MAX_CONNECT_ATTEMPTS, reason: 'boom' }),
    )
  })

  it('ignores the message when every guard declines and no otherwise exists', () => {
    const atLimit = Connecting({ attemptCount: MAX_CONNECT_ATTEMPTS })

    const result = guardValueMachine.step(
      atLimit,
      SocketErrored({ reason: 'boom' }),
    )
    expect(result).toEqual({
      _tag: 'Ignored',
      stateTag: 'Connecting',
      messageTag: 'SocketErrored',
      state: atLimit,
    })

    const [unchanged, commands] = guardValueMachine.transition(
      atLimit,
      SocketErrored({ reason: 'boom' }),
    )
    expect(unchanged).toBe(atLimit)
    expect(commands).toEqual([])
  })
})

describe('state tag extraction', () => {
  it('reads tags from members whose _tag is a plain Literal', () => {
    expect(plainTagMachine.stateTags).toEqual(['PlainIdle', 'PlainActive'])

    const [active] = plainTagMachine.transition(
      { _tag: 'PlainIdle' },
      ClickedFetch(),
    )
    expect(active).toStrictEqual({ _tag: 'PlainActive' })
  })
})

describe('type-level guarantees', () => {
  it('narrows state and message to the table position without annotations', () => {
    const [failed] = narrowingMachine.transition(
      Connecting({ attemptCount: 0 }),
      SocketErrored({ reason: 'boom' }),
    )
    expect(failed).toStrictEqual(
      Failed({ attemptCount: 0, reason: 'Connecting SocketErrored boom' }),
    )
  })

  it('passes the guard value into the matching edge', () => {
    const [reconnecting] = guardValueMachine.transition(
      Connecting({ attemptCount: 2 }),
      SocketErrored({ reason: 'offline' }),
    )

    expect(reconnecting).toStrictEqual(
      Reconnecting({ attemptCount: 3, delayMillis: 500 }),
    )
  })

  it('still constructs machines whose tables were rejected at the type level', () => {
    expect(wrongVariantMachine.initial).toStrictEqual(Idle())
    expect(wrongTargetTagMachine.initial).toStrictEqual(Idle())
    expect(unknownStateTagMachine.initial).toStrictEqual(Idle())
    expect(unknownMessageTagMachine.initial).toStrictEqual(Idle())
  })

  it('reports guards listed after otherwise as dead', () => {
    expect(shadowedGuardMachine.deadTransitions()).toEqual([
      {
        edge: {
          from: 'Idle',
          messageTag: 'ClickedFetch',
          target: 'Ok',
          guard: { _tag: 'When', position: 1 },
        },
        reason: 'ShadowedByOtherwise',
      },
    ])
  })
})

describe('integration', () => {
  it('splices the machine into update via evo', () => {
    const model: AppModel = {
      connection: Disconnected(),
      isDebugPanelOpen: false,
    }

    const [nextModel, commands] = update(model, ClickedConnect())
    expect(nextModel.connection).toStrictEqual(Connecting({ attemptCount: 1 }))
    expect(nextModel.isDebugPanelOpen).toBe(false)
    expect(commands).toEqual([])

    const [unchangedModel, ignoredCommands] = update(model, ReleasedSocket())
    expect(unchangedModel).toBe(model)
    expect(ignoredCommands).toEqual([])
  })

  it('wires the gating sketch records', () => {
    expect(Object.keys(managedResources)).toEqual(['socket'])
    expect(Object.keys(subscriptions)).toEqual(['backoffTimer'])
  })
})
