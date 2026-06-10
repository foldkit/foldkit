import { Context, Effect, Option, Queue, Schema, Stream } from 'effect'

import { persistent } from '../runtime/subscription.js'

/** Type-level brand for inbound Port values. */
/* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
export const InboundTypeId: unique symbol = Symbol.for(
  'foldkit/Port/Inbound',
) as unknown as InboundTypeId

/** Type-level brand for inbound Port values. */
export type InboundTypeId = typeof InboundTypeId

/** Type-level brand for outbound Port values. */
/* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
export const OutboundTypeId: unique symbol = Symbol.for(
  'foldkit/Port/Outbound',
) as unknown as OutboundTypeId

/** Type-level brand for outbound Port values. */
export type OutboundTypeId = typeof OutboundTypeId

/**
 * A typed channel for values flowing from the host into the app. The app
 * consumes the decoded values as a Subscription source via `Port.stream` or
 * `Port.subscription`; the host pushes encoded values through the
 * `EmbedHandle` returned by `Runtime.embed`. Create with `Port.inbound`.
 */
export interface Inbound<Value, Encoded> {
  readonly [InboundTypeId]: InboundTypeId
  readonly schema: Schema.Codec<Value, Encoded>
}

/**
 * A typed channel for values flowing from the app out to the host. The app
 * emits values with `Port.emit` inside its own Commands; the host listens
 * through the `EmbedHandle` returned by `Runtime.embed`. Create with
 * `Port.outbound`.
 */
export interface Outbound<Value, Encoded> {
  readonly [OutboundTypeId]: OutboundTypeId
  readonly schema: Schema.Codec<Value, Encoded>
}

/**
 * The Ports record passed to `makeApplication` or `makeElement` via the
 * `ports` config field. Record keys name the ports; the names appear on the
 * `EmbedHandle` and in boundary error messages.
 */
export type Ports = Readonly<{
  inbound?: Readonly<Record<string, Inbound<any, any>>>
  outbound?: Readonly<Record<string, Outbound<any, any>>>
}>

/**
 * Declares an inbound Port carrying values of the given Schema. The host
 * sends values in the Schema's Encoded form; they are validated by decoding
 * at the boundary, so only well-formed `Value`s ever reach the app.
 *
 * @example
 * ```ts
 * export const ports = {
 *   inbound: { stepChanged: Port.inbound(S.Number) },
 *   outbound: { countChanged: Port.outbound(S.Number) },
 * }
 * ```
 */
export const inbound = <Value, Encoded>(
  schema: Schema.Codec<Value, Encoded>,
): Inbound<Value, Encoded> => ({
  [InboundTypeId]: InboundTypeId,
  schema,
})

/**
 * Declares an outbound Port carrying values of the given Schema. The app
 * emits `Value`s with `Port.emit`; they are encoded at the boundary, so host
 * listeners receive the Schema's Encoded form.
 *
 * @example
 * ```ts
 * export const ports = {
 *   inbound: { stepChanged: Port.inbound(S.Number) },
 *   outbound: { countChanged: Port.outbound(S.Number) },
 * }
 * ```
 */
export const outbound = <Value, Encoded>(
  schema: Schema.Codec<Value, Encoded>,
): Outbound<Value, Encoded> => ({
  [OutboundTypeId]: OutboundTypeId,
  schema,
})

/** Per-runtime-instance channel for one inbound Port. Values sent before the
 *  app's first `Port.stream` for the Port attaches are kept in order and
 *  delivered to that first attach; afterwards values go to every attached
 *  stream, and values sent while none is attached are dropped (matching
 *  gated-Subscription semantics). Internal to the runtime. */
export type __InboundChannel = Readonly<{
  deliver: (value: unknown) => void
  attach: (push: (value: unknown) => void) => () => void
}>

/** The per-runtime-instance Port wiring read by `Port.stream` and
 *  `Port.emit`. Internal to the runtime. */
export type __PortChannels = Readonly<{
  isConfigured: boolean
  lookupInbound: (port: Inbound<any, any>) => Option.Option<__InboundChannel>
  lookupOutbound: (
    port: Outbound<any, any>,
  ) => Option.Option<(encodedValue: unknown) => void>
}>

const defaultPortChannels: __PortChannels = {
  isConfigured: false,
  lookupInbound: () => Option.none(),
  lookupOutbound: () => Option.none(),
}

/** Reference through which the runtime provides the current instance's Port
 *  wiring to Subscription Streams and Command Effects. A Reference has a
 *  default value, so reading it never adds a service requirement; the default
 *  marks Ports as unconfigured. Internal to the runtime. */
export const __CurrentPortChannels = Context.Reference<__PortChannels>(
  'foldkit/Port/CurrentPortChannels',
  { defaultValue: () => defaultPortChannels },
)

/** Creates the channel for one inbound Port. Internal to the runtime. */
export const __makeInboundChannel = (): __InboundChannel => {
  const subscribers = new Set<(value: unknown) => void>()
  let maybeBacklog: Option.Option<Array<unknown>> = Option.some([])

  const deliver = (value: unknown): void => {
    if (subscribers.size > 0) {
      subscribers.forEach(push => push(value))
    } else if (Option.isSome(maybeBacklog)) {
      maybeBacklog.value.push(value)
    }
  }

  const attach = (push: (value: unknown) => void): (() => void) => {
    subscribers.add(push)
    if (Option.isSome(maybeBacklog)) {
      const backlog = maybeBacklog.value
      maybeBacklog = Option.none()
      backlog.forEach(push)
    }
    return () => {
      subscribers.delete(push)
    }
  }

  return { deliver, attach }
}

const notConfiguredMessage = (functionName: string): string =>
  `[foldkit] ${functionName} was called, but this program has no ports config. ` +
  'Declare Ports with Port.inbound and Port.outbound and pass the record to ' +
  'makeApplication or makeElement via the ports field.'

const unknownPortMessage = (functionName: string): string =>
  `[foldkit] ${functionName} was called with a Port that is not in this ` +
  "program's ports config. Every Port the app uses must appear in the ports " +
  'record passed to makeApplication or makeElement.'

/**
 * The decoded values arriving on an inbound Port, as a Stream. This is the
 * atomic primitive for consuming a Port inside a Subscription entry; reach
 * for `Port.subscription` when you want the common always-on form. Values
 * sent while no Stream for the Port is running are dropped, except for
 * values sent before the first Stream attaches, which are buffered and
 * delivered to it in order (so host sends issued right after `Runtime.embed`
 * are not lost during startup).
 */
export const stream = <Value, Encoded>(
  port: Inbound<Value, Encoded>,
): Stream.Stream<Value> =>
  Stream.unwrap(
    Effect.gen(function* () {
      const channels = yield* __CurrentPortChannels
      if (!channels.isConfigured) {
        return yield* Effect.die(new Error(notConfiguredMessage('Port.stream')))
      }
      const channel = yield* Option.match(channels.lookupInbound(port), {
        onNone: () => Effect.die(new Error(unknownPortMessage('Port.stream'))),
        onSome: Effect.succeed,
      })
      return Stream.callback<Value>(queue =>
        Effect.acquireRelease(
          Effect.sync(() =>
            channel.attach(value => {
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
              Queue.offerUnsafe(queue, value as Value)
            }),
          ),
          detach => Effect.sync(() => detach()),
        ).pipe(Effect.flatMap(() => Effect.never)),
      )
    }),
  )

/**
 * Builds a Subscription entry that wraps every decoded value arriving on an
 * inbound Port into a Message. The entry is persistent: it runs for the
 * runtime's lifetime, independent of the Model. Pass it as an entry value
 * inside `Subscription.make`. For a Model-gated entry, build one yourself
 * from `Port.stream`.
 *
 * @example
 * ```ts
 * const subscriptions = Subscription.make<Model, Message>()(_entry => ({
 *   hostStep: Port.subscription(ports.inbound.stepChanged, step =>
 *     ChangedStep({ step }),
 *   ),
 * }))
 * ```
 */
export const subscription = <Value, Encoded, Message>(
  port: Inbound<Value, Encoded>,
  toMessage: (value: Value) => Message,
) => persistent(Stream.map(stream(port), toMessage))

/**
 * Emits a value on an outbound Port. The value is encoded against the Port's
 * Schema and delivered to every host listener subscribed through the
 * `EmbedHandle`. Compose it into the app's own Commands like any other
 * Effect:
 *
 * ```ts
 * const ReportCount = Command.define(
 *   'ReportCount',
 *   { count: S.Number },
 *   CompletedReportCount,
 * )(({ count }) =>
 *   Port.emit(ports.outbound.countChanged, count).pipe(
 *     Effect.as(CompletedReportCount()),
 *   ),
 * )
 * ```
 *
 * When the program runs without an embed handle (started with `Runtime.run`),
 * emitting is a no-op.
 */
export const emit = <Value, Encoded>(
  port: Outbound<Value, Encoded>,
  value: Value,
): Effect.Effect<void> =>
  Effect.gen(function* () {
    const channels = yield* __CurrentPortChannels
    if (!channels.isConfigured) {
      return yield* Effect.die(new Error(notConfiguredMessage('Port.emit')))
    }
    const deliver = yield* Option.match(channels.lookupOutbound(port), {
      onNone: () => Effect.die(new Error(unknownPortMessage('Port.emit'))),
      onSome: Effect.succeed,
    })
    const encodedValue = yield* Effect.orDie(
      Schema.encodeEffect(port.schema)(value),
    )
    deliver(encodedValue)
  })
