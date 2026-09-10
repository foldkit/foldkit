import { Cause, Exit, Function, Option, Predicate, Schema } from 'effect'

import {
  type Inbound,
  type Outbound,
  type Ports,
  type __InboundChannel,
  type __PortChannels,
  __makeInboundChannel,
} from '../port/index.js'

/** Host-side handle for one inbound Port. `send` validates the value by
 *  decoding it against the Port's Schema: on success the decoded value enters
 *  the app through the Port's Subscription; on failure nothing reaches the
 *  app, the failure is logged, and the returned `Exit` carries the
 *  `SchemaError`. Sends after `dispose` are no-ops. */
export type InboundPortHandle<Encoded> = Readonly<{
  send: (value: Encoded) => Exit.Exit<void, Schema.SchemaError>
}>

/** Host-side handle for one outbound Port. `subscribe` registers a listener
 *  for the encoded values the app emits with `Port.emit` and returns an
 *  unsubscribe function. Multiple listeners receive each value in
 *  registration order. */
export type OutboundPortHandle<Encoded> = Readonly<{
  subscribe: (listener: (value: Encoded) => void) => () => void
}>

/** The inbound half of `PortHandles`: one `InboundPortHandle` per declared
 *  inbound Port, keyed by Port name. */
export type InboundPortHandles<InboundPorts> =
  InboundPorts extends Readonly<Record<string, Inbound<any, any>>>
    ? {
        readonly [
          Name in keyof InboundPorts
        ]: InboundPorts[Name] extends Inbound<any, infer Encoded>
          ? InboundPortHandle<Encoded>
          : never
      }
    : unknown

/** The outbound half of `PortHandles`: one `OutboundPortHandle` per declared
 *  outbound Port, keyed by Port name. */
export type OutboundPortHandles<OutboundPorts> =
  OutboundPorts extends Readonly<Record<string, Outbound<any, any>>>
    ? {
        readonly [
          Name in keyof OutboundPorts
        ]: OutboundPorts[Name] extends Outbound<any, infer Encoded>
          ? OutboundPortHandle<Encoded>
          : never
      }
    : unknown

/** The `ports` field of an `EmbedHandle`: one `InboundPortHandle` or
 *  `OutboundPortHandle` per declared Port, keyed by Port name. */
export type PortHandles<P extends Ports | undefined> = P extends Ports
  ? InboundPortHandles<P['inbound']> & OutboundPortHandles<P['outbound']>
  : unknown

/**
 * The handle returned by `embed`. The host talks to the embedded app only
 * through it: `ports.<name>.send` pushes values in, `ports.<name>.subscribe`
 * listens to values the app emits, and `dispose` shuts the runtime down.
 *
 * `dispose` is idempotent. It interrupts the runtime and runs all cleanup:
 * Subscriptions, ManagedResources, Mounts, listeners, and in-flight Commands
 * stop, and the rendered DOM is removed with the container element restored
 * empty in its place, ready for a fresh `embed`.
 */
export type EmbedHandle<P extends Ports | undefined = undefined> = Readonly<{
  ports: PortHandles<P>
  dispose: () => void
}>

export type HostConnector = Readonly<{
  sendInbound: (
    portName: string,
    port: Inbound<any, any>,
    value: unknown,
  ) => Exit.Exit<void, Schema.SchemaError>
  addListener: (
    port: Outbound<any, any>,
    listener: (encodedValue: unknown) => void,
  ) => () => void
  deliverOutbound: (port: Outbound<any, any>, encodedValue: unknown) => void
  bind: (
    deliverInbound: (port: Inbound<any, any>, value: unknown) => void,
  ) => void
  unbind: () => void
  dispose: () => void
}>

export const makeHostConnector = (): HostConnector => {
  let isDisposed = false
  let maybeDeliverInbound: Option.Option<
    (port: Inbound<any, any>, value: unknown) => void
  > = Option.none()
  const pendingInboundSends: Array<{
    port: Inbound<any, any>
    value: unknown
  }> = []
  const listenersByPort = new Map<
    Outbound<any, any>,
    Set<(encodedValue: unknown) => void>
  >()

  const sendInbound = (
    portName: string,
    port: Inbound<any, any>,
    value: unknown,
  ): Exit.Exit<void, Schema.SchemaError> => {
    if (isDisposed) {
      return Exit.void
    }
    const decodeExit = Schema.decodeUnknownExit(port.schema)(value)
    Exit.match(decodeExit, {
      onFailure: cause => {
        console.error(
          `[foldkit] Inbound port "${portName}" rejected a value:`,
          Cause.squash(cause),
        )
      },
      onSuccess: decodedValue => {
        Option.match(maybeDeliverInbound, {
          onNone: () => {
            pendingInboundSends.push({ port, value: decodedValue })
          },
          onSome: deliverInbound => deliverInbound(port, decodedValue),
        })
      },
    })
    return Exit.asVoid(decodeExit)
  }

  const addListener = (
    port: Outbound<any, any>,
    listener: (encodedValue: unknown) => void,
  ): (() => void) => {
    if (isDisposed) {
      return Function.constVoid
    }
    const listeners = listenersByPort.get(port) ?? new Set()
    listenersByPort.set(port, listeners)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  // NOTE: delivery is deferred to a microtask so a host listener never runs
  // inside the runtime's Command fiber (a listener that synchronously calls
  // send or dispose must not re-enter the runtime), and so a host that
  // subscribes synchronously right after embed() returns still receives
  // emissions from init Commands.
  const deliverOutbound = (
    port: Outbound<any, any>,
    encodedValue: unknown,
  ): void => {
    if (isDisposed) {
      return
    }
    queueMicrotask(() => {
      if (isDisposed) {
        return
      }
      const listeners = listenersByPort.get(port) ?? new Set()
      listeners.forEach(listener => {
        try {
          listener(encodedValue)
        } catch (listenerError) {
          console.error(
            '[foldkit] An outbound port listener threw:',
            listenerError,
          )
        }
      })
    })
  }

  const bind = (
    deliverInbound: (port: Inbound<any, any>, value: unknown) => void,
  ): void => {
    maybeDeliverInbound = Option.some(deliverInbound)
    const flushedSends = pendingInboundSends.splice(0)
    flushedSends.forEach(({ port, value }) => deliverInbound(port, value))
  }

  const unbind = (): void => {
    maybeDeliverInbound = Option.none()
  }

  const dispose = (): void => {
    isDisposed = true
    pendingInboundSends.length = 0
    listenersByPort.forEach(listeners => listeners.clear())
    listenersByPort.clear()
  }

  return { sendInbound, addListener, deliverOutbound, bind, unbind, dispose }
}

export type PortChannelsBundle = Readonly<{
  channels: __PortChannels
  deliverInbound: (port: Inbound<any, any>, value: unknown) => void
}>

export const makePortChannels = (
  ports: Ports,
  maybeConnector: Option.Option<HostConnector>,
): PortChannelsBundle => {
  const inboundChannelsByPort = new Map<Inbound<any, any>, __InboundChannel>()
  Object.values(ports.inbound ?? {}).forEach(port => {
    inboundChannelsByPort.set(port, __makeInboundChannel())
  })

  const outboundPorts = new Set(Object.values(ports.outbound ?? {}))

  const channels: __PortChannels = {
    isConfigured: true,
    lookupInbound: port =>
      Option.fromNullishOr(inboundChannelsByPort.get(port)),
    lookupOutbound: port =>
      outboundPorts.has(port)
        ? Option.some(encodedValue =>
            Option.match(maybeConnector, {
              onNone: Function.constVoid,
              onSome: connector =>
                connector.deliverOutbound(port, encodedValue),
            }),
          )
        : Option.none(),
  }

  const deliverInbound = (port: Inbound<any, any>, value: unknown): void => {
    Option.match(Option.fromNullishOr(inboundChannelsByPort.get(port)), {
      onNone: Function.constVoid,
      onSome: channel => channel.deliver(value),
    })
  }

  return { channels, deliverInbound }
}

export const validatePorts = (ports: Ports): void => {
  const inboundEntries = Object.entries(ports.inbound ?? {})
  const outboundEntries = Object.entries(ports.outbound ?? {})

  const inboundNames = new Set(inboundEntries.map(([name]) => name))
  outboundEntries.forEach(([name]) => {
    if (inboundNames.has(name)) {
      throw new Error(
        `[foldkit] Port name "${name}" appears in both inbound and outbound. ` +
          'Port names share one namespace on the EmbedHandle, so each name ' +
          'must be unique across both records.',
      )
    }
  })

  const seenPorts = new Set<unknown>()
  const allEntries = [...inboundEntries, ...outboundEntries]
  allEntries.forEach(([name, port]) => {
    if (seenPorts.has(port)) {
      throw new Error(
        `[foldkit] The Port registered as "${name}" is also registered under ` +
          'another name. Each entry in the ports record needs its own ' +
          'Port.inbound or Port.outbound value.',
      )
    }
    seenPorts.add(port)
  })
}

export const buildPortHandles = <P extends Ports | undefined>(
  ports: P,
  connector: HostConnector,
): PortHandles<P> => {
  const handles: Record<string, unknown> = {}

  if (Predicate.isNotUndefined(ports)) {
    Object.entries(ports.inbound ?? {}).forEach(([portName, port]) => {
      handles[portName] = {
        send: (value: unknown) => connector.sendInbound(portName, port, value),
      }
    })
    Object.entries(ports.outbound ?? {}).forEach(([portName, port]) => {
      handles[portName] = {
        subscribe: (listener: (encodedValue: unknown) => void) =>
          connector.addListener(port, listener),
      }
    })
  }

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return handles as PortHandles<P>
}
