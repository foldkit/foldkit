import { Cause, Effect, Fiber, Option, Predicate, Runtime, pipe } from 'effect'

import { BrowserRuntime } from '@effect/platform-browser'

import { buildIdOrInjected } from '../buildToken.js'
import type { Ports } from '../port/index.js'
import { provideBrowserScheduler } from './browserScheduler.js'
import {
  type EmbedHandle,
  buildPortHandles,
  makeHostConnector,
} from './hostConnector.js'
import { type BootMode, findEmbeddedHydration } from './hydrationHandoff.js'
import { resolvePreservedModel } from './modelPreservationBridge.js'
import { type MakeRuntimeReturn, runtimeInternals } from './runtime.js'

/** Client-only startup input for an application that declares Flags. Pass it
 *  to `run` or `embed`; `hydrate` instead decodes the exact Flags value
 *  embedded by the server render.
 */
export type RunOptions<Flags, Resources = never> = Readonly<{
  flags: Effect.Effect<Flags, never, Resources>
}>

/** Options for {@link embed} that adopt a server-rendered root instead of
 *  building the container's DOM fresh. */
export type EmbedHydrationOptions = Readonly<{
  /**
   * Adopt the container's server-rendered markup, when it carries the root
   * stamp `renderToString` writes with `isEmbedded: true`. The program keeps
   * the existing nodes and reconstructs its Model from the Flags payload the
   * server embedded. A container with no stamp builds fresh, and a program
   * that declares Flags then uses the `flags` option as `embed` always has.
   * Only a program created by `makeElement` can adopt a root.
   */
  isHydratable?: boolean
  /** The deployment this client belongs to. See {@link HydrateOptions}. */
  buildId?: string
}>

type RuntimeProgram = Readonly<{
  runtimeId: string
  start: (preservedModel?: unknown) => Effect.Effect<void>
  ports: Ports | undefined
}>

/** Starts a program Effect with explicit boot inputs for runtime tests.
 * @internal */
export const __startProgram = (
  program: RuntimeProgram,
  preservedModel: unknown,
  bootMode: BootMode,
  flags?: Effect.Effect<unknown, never, any>,
  buildId?: string,
): Effect.Effect<void> => {
  const internals = runtimeInternals.get(program)
  if (Predicate.isUndefined(internals)) {
    return Effect.die(
      new Error(
        '[foldkit] Runtime boot expects a program created by ' +
          'makeApplication or makeElement.',
      ),
    )
  }

  if (bootMode === 'Hydrate' && internals.kind !== 'Application') {
    return Effect.die(
      new Error(
        '[foldkit] Runtime.hydrate expects a program created by ' +
          'makeApplication.',
      ),
    )
  }

  return internals.startWith(
    Option.none(),
    preservedModel,
    bootMode,
    flags,
    buildId,
  )
}

/** Reports unhandled non-interrupt Causes using Effect's runtime policy.
 * @internal */
export const __reportUnhandledCause = <E>(
  cause: Cause.Cause<E>,
): Effect.Effect<void> => {
  if (Cause.hasInterruptsOnly(cause)) {
    return Effect.void
  }

  return Runtime.getErrorReported(Cause.squash(cause))
    ? Effect.logError(cause)
    : Effect.void
}

const withUnhandledCauseReporting = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R> => Effect.tapCause(effect, __reportUnhandledCause)

const startProgram = (
  program: RuntimeProgram,
  bootMode: BootMode,
  flags?: Effect.Effect<unknown, never, any>,
  buildId?: string,
): void => {
  BrowserRuntime.runMain(
    withUnhandledCauseReporting(
      provideBrowserScheduler(
        Effect.flatMap(
          resolvePreservedModel(program.runtimeId),
          preservedModel =>
            __startProgram(program, preservedModel, bootMode, flags, buildId),
        ),
      ),
    ),
    { disableErrorReporting: true },
  )
}

/** Starts a Foldkit runtime that owns the page for the page's whole lifetime,
 *  with state-preserving live reload for development. The first render builds
 *  the DOM fresh in the container, replacing whatever is there. On a
 *  server-rendered page use `hydrate` instead, which adopts the existing DOM.
 *  To start a runtime under a host-controlled lifecycle, use `embed`. */
export function run<
  P extends Ports | undefined,
  Resources,
  Kind extends 'Application' | 'Element',
>(program: MakeRuntimeReturn<P, void, Resources, Kind>): void
export function run<
  P extends Ports | undefined,
  Flags,
  Resources,
  Kind extends 'Application' | 'Element',
>(
  program: MakeRuntimeReturn<P, Flags, Resources, Kind>,
  options: RunOptions<Flags, Resources>,
): void
export function run(
  program: RuntimeProgram,
  options?: RunOptions<unknown, any>,
): void {
  startProgram(program, 'Fresh', options?.flags)
}

/** Options for {@link hydrate}. */
export type HydrateOptions = Readonly<{
  /**
   * The deployment this client belongs to, compared against the id the server
   * stamped on the root before the Flags payload text is accessed or decoded,
   * so a page from a different deployment stops startup rather than handing its
   * Flags to this build. When omitted, Foldkit uses the identity compiled into
   * this artifact by `@foldkit/vite-plugin`. An explicit id overrides that
   * value and must be non-empty: an absent id would equal the absent marker on
   * a page served before build ids existed.
   *
   * This explicit option is for integrations that cannot compile the shared
   * identity into the artifact. Give the server the same public,
   * deployment-specific value.
   */
  buildId?: string
}>

/** Starts a Foldkit runtime by adopting a server-rendered DOM in place instead
 *  of building it fresh. Use this as the client entry for a page served by
 *  `renderToString`: the first render attaches to the stamped root, keeps the
 *  existing nodes, and reconstructs the Model from the Flags the server
 *  embedded. The handoff is strict: a missing server root, an empty or
 *  duplicated root stamp, more than one stamped root, a requested root outside
 *  the document body light DOM, a missing Flags payload, an undecodable
 *  payload, or a page from another deployment terminates startup. Every one of
 *  those contains the page first:
 *  the document's body is marked `inert` and a nondismissable modal shield is
 *  opened above existing top-layer content, so pointer and physical keyboard
 *  input do not activate same-document native links, forms, or controls.
 *  Containment leaves author-owned dialogs open without calling `close` or
 *  dispatching `cancel`.
 *  Nothing is moved, so no custom element reconnects and no frame reloads.
 *  This is not a script, event, or embedded-document sandbox: existing
 *  capture-phase handlers, browser-generated top-layer events, timers, and
 *  stale scripts can still run. Controls in embedded documents can still
 *  receive input if stale code focuses them. Stale code can also open newer
 *  top-layer UI. Use `run` in a separate client-only entry when the page should
 *  boot without server output.
 *
 * @experimental Server rendering and hydration are experimental while their
 * contracts settle. */
export const hydrate = <P extends Ports | undefined, Flags, Resources>(
  program: MakeRuntimeReturn<P, Flags, Resources, 'Application'>,
  options?: HydrateOptions,
): void => {
  startProgram(
    program,
    'Hydrate',
    undefined,
    buildIdOrInjected(options?.buildId),
  )
}

/**
 * Starts a Foldkit runtime under a host-controlled lifecycle and returns an
 * `EmbedHandle`. This is the entry point for embedding a Foldkit app inside
 * another application: the host pushes values in through the handle's inbound
 * Ports, listens to outbound Ports, and calls `dispose` when it unmounts the
 * app. The host never touches the Model or dispatches Messages directly; the
 * Schema-typed Ports are the whole boundary.
 *
 * Works with programs from both `makeApplication` and `makeElement`; for a
 * widget on a page the host owns, `makeElement` is the natural fit.
 *
 * A program can be embedded once at a time (it owns one container). After
 * `dispose`, the same container can be embedded again with a fresh program.
 *
 * On a page the server rendered, pass `isHydratable: true` to adopt the
 * container's markup in place instead of rebuilding it. The container must be
 * the root `renderToString` stamped with `isEmbedded: true`, and its `runtimeId`
 * must be the container's `id`. Each embedded program reads its own Flags
 * payload, so a page can hold any number of them, beside at most one
 * application adopted with `hydrate`. A container without the stamp builds
 * fresh. Every other hydration refusal behaves as it does for `hydrate`: it
 * contains the page and stops startup. Only `makeElement` programs can adopt a
 * root.
 *
 * ```ts
 * const handle = Runtime.embed(element)
 *
 * handle.ports.stepChanged.send(5)
 * const unsubscribe = handle.ports.countChanged.subscribe(count => {
 *   console.log(count)
 * })
 *
 * handle.dispose()
 * ```
 */
export function embed<
  P extends Ports | undefined = undefined,
  Resources = never,
  Kind extends 'Application' | 'Element' = 'Application' | 'Element',
>(
  program: MakeRuntimeReturn<P, void, Resources, Kind>,
  options?: EmbedHydrationOptions,
): EmbedHandle<P>
export function embed<
  P extends Ports | undefined,
  Flags,
  Resources,
  Kind extends 'Application' | 'Element',
>(
  program: MakeRuntimeReturn<P, Flags, Resources, Kind>,
  options: RunOptions<Flags, Resources> & EmbedHydrationOptions,
): EmbedHandle<P>
export function embed<P extends Ports | undefined = undefined>(
  program: RuntimeProgram & Readonly<{ ports: P }>,
  options?: Partial<RunOptions<unknown, any>> & EmbedHydrationOptions,
): EmbedHandle<P> {
  const internals = runtimeInternals.get(program)
  if (Predicate.isUndefined(internals)) {
    throw new Error(
      '[foldkit] embed expects a program created by makeApplication or makeElement.',
    )
  }

  const isHydratable = options?.isHydratable === true
  if (isHydratable && internals.kind !== 'Element') {
    throw new Error(
      '[foldkit] embed can adopt a server-rendered root only for a program ' +
        'created by makeElement. A program created by makeApplication owns ' +
        'the page: adopt it with Runtime.hydrate.',
    )
  }

  if (internals.isEmbedActive) {
    throw new Error(
      '[foldkit] This program is already embedded. Dispose the existing ' +
        'handle first, or create a separate program: each program owns one ' +
        'container.',
    )
  }
  internals.isEmbedActive = true

  const connector = makeHostConnector()

  // NOTE: a dispose immediately followed by a fresh embed (React strict mode
  // runs effects exactly that way) must not start the new runtime while the
  // old one is still tearing down: the teardown finalizer is what puts the
  // container element back in the DOM. Awaiting the previous fiber's exit
  // sequences the two.
  const startEffect = pipe(
    Option.match(internals.maybeActiveFiber, {
      onNone: () => Effect.void,
      onSome: previousFiber => Effect.asVoid(Fiber.await(previousFiber)),
    }),
    Effect.andThen(resolvePreservedModel(program.runtimeId)),
    Effect.flatMap(preservedModel => {
      // NOTE: the root is looked up here, after the previous embed's teardown,
      // so a dispose-then-embed remount finds the stamp already consumed and
      // builds fresh instead of adopting a root it has already rendered over.
      const maybeHydration = isHydratable
        ? Option.fromNullishOr(
            findEmbeddedHydration(
              internals.container,
              internals.isFlagsRequired,
            ),
          )
        : Option.none()
      return internals.startWith(
        Option.some(connector),
        preservedModel,
        Option.isSome(maybeHydration) ? 'Hydrate' : 'Fresh',
        options?.flags,
        Option.isSome(maybeHydration)
          ? buildIdOrInjected(options?.buildId)
          : undefined,
        Option.getOrUndefined(maybeHydration),
      )
    }),
  )

  const fiber = Effect.runFork(
    withUnhandledCauseReporting(provideBrowserScheduler(startEffect)),
  )
  internals.maybeActiveFiber = Option.some(fiber)

  let isHandleDisposed = false
  const dispose = (): void => {
    if (isHandleDisposed) {
      return
    }
    isHandleDisposed = true
    connector.dispose()
    internals.isEmbedActive = false
    Effect.runFork(Fiber.interrupt(fiber))
  }

  const ports = buildPortHandles(program.ports, connector)

  return { ports, dispose }
}
