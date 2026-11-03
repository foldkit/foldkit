import { Duration, Effect, FileSystem, Number, Option, String } from 'effect'
import type { RelayNamespaces, RelayRecord } from 'foldkit/devtools-protocol'
import { connect } from 'node:net'

const NAMESPACE_DIRECTORY = '/proc/self/ns'
const PROBE_TIMEOUT = Duration.seconds(1)
const WEBSOCKET_PORT = 80
const SECURE_WEBSOCKET_PORT = 443
const IPV6_BRACKETS = /^\[|\]$/g

type RelayAddress = Readonly<{ host: string; port: number }>

export type RelayStatus = 'Running' | 'Gone' | 'Unreachable'

export const readProcessNamespaces: Effect.Effect<
  Option.Option<RelayNamespaces>,
  never,
  FileSystem.FileSystem
> = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem
  const pid = yield* fileSystem.readLink(`${NAMESPACE_DIRECTORY}/pid`)
  const network = yield* fileSystem.readLink(`${NAMESPACE_DIRECTORY}/net`)

  return Option.some({ pid, network })
}).pipe(Effect.orElseSucceed(() => Option.none<RelayNamespaces>()))

const isProcessAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error instanceof Error && 'code' in error && error.code === 'EPERM'
  }
}

const relayAddress = (url: string): Option.Option<RelayAddress> =>
  Option.flatMap(Option.fromNullishOr(URL.parse(url)), parsed => {
    const host = parsed.hostname.replace(IPV6_BRACKETS, '')

    if (String.isNonEmpty(parsed.port)) {
      return Option.map(Number.parse(parsed.port), port => ({ host, port }))
    } else if (parsed.protocol === 'wss:') {
      return Option.some({ host, port: SECURE_WEBSOCKET_PORT })
    } else {
      return Option.some({ host, port: WEBSOCKET_PORT })
    }
  })

const refusesConnections = ({
  host,
  port,
}: RelayAddress): Effect.Effect<boolean> =>
  Effect.callback<boolean>(resume => {
    const socket = connect({ host, port })
    const settle = (isRefused: boolean) => {
      socket.destroy()
      resume(Effect.succeed(isRefused))
    }

    socket.once('connect', () => settle(false))
    socket.once('error', error =>
      settle('code' in error && error.code === 'ECONNREFUSED'),
    )

    return Effect.sync(() => socket.destroy())
  }).pipe(
    Effect.timeoutOption(PROBE_TIMEOUT),
    Effect.map(Option.getOrElse(() => false)),
  )

const statusFromPort = (url: string): Effect.Effect<RelayStatus> =>
  Option.match(relayAddress(url), {
    onNone: () => Effect.succeed<RelayStatus>('Running'),
    onSome: address =>
      Effect.map(refusesConnections(address), (isRefused): RelayStatus =>
        isRefused ? 'Gone' : 'Running',
      ),
  })

// NOTE: kill(pid, 0) answers for this process's PID namespace only. A relay
// published from another PID namespace looks dead even while it runs, so its
// record counts as gone only when its port refuses connections. A relay in
// another network namespace listens on a loopback this process cannot reach.
export const checkRelay = (
  record: RelayRecord,
  maybeOwnNamespaces: Option.Option<RelayNamespaces>,
): Effect.Effect<RelayStatus> => {
  const maybeRecordNamespaces = Option.fromNullishOr(record.namespaces)
  const maybeBothNamespaces = Option.all([
    maybeOwnNamespaces,
    maybeRecordNamespaces,
  ])
  const hasNoNamespaces =
    Option.isNone(maybeOwnNamespaces) && Option.isNone(maybeRecordNamespaces)
  const isSamePidNamespace = Option.exists(
    maybeBothNamespaces,
    ([own, recorded]) => own.pid === recorded.pid,
  )
  const isOtherNetworkNamespace = Option.exists(
    maybeBothNamespaces,
    ([own, recorded]) => own.network !== recorded.network,
  )

  if (
    Option.isSome(maybeRecordNamespaces) &&
    Option.isNone(maybeOwnNamespaces)
  ) {
    return Effect.succeed('Unreachable')
  } else if (isOtherNetworkNamespace) {
    return Effect.succeed('Unreachable')
  } else if (
    isSamePidNamespace ||
    (hasNoNamespaces && process.platform !== 'linux')
  ) {
    return Effect.succeed(isProcessAlive(record.pid) ? 'Running' : 'Gone')
  } else if (
    Option.isNone(maybeRecordNamespaces) &&
    isProcessAlive(record.pid)
  ) {
    return Effect.succeed('Running')
  } else {
    return statusFromPort(record.url)
  }
}
