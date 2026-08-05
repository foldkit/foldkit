import { Context, Data, Effect, Option, Predicate, Schema } from 'effect'

import { beginRender, createBoundaryRegistry } from '../../html/boundary.js'
import {
  type Document,
  type HtmlBuilder,
  __htmlBuilder as htmlBuilderFor,
  textDirectionToAttribute,
} from '../../html/index.js'
import {
  type DispatchSync,
  clearRuntime,
  setRuntime,
} from '../../html/runtimeSingleton.js'
import {
  FOLDKIT_APP_ATTRIBUTE,
  FOLDKIT_FLAGS_ATTRIBUTE,
} from '../../hydrationMarker.js'
import { Url, fromString } from '../../url/index.js'
import { escapeAttributeValue, serializeHtml } from './serialize.js'

export { FOLDKIT_APP_ATTRIBUTE, FOLDKIT_FLAGS_ATTRIBUTE }

const DEFAULT_RUNTIME_ID = 'app'

/** The server render of one request: the stamped root markup (plus the Flags
 *  payload script when the application declares Flags) and the `Document`
 *  head fields for the host to place into its HTML template.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type RenderedApplication = Readonly<{
  html: string
  title: string
  lang?: string
  dir?: 'ltr' | 'rtl' | 'auto'
  canonical?: string
  ogUrl?: string
}>

/** Failure of a routing render whose `url` option cannot be parsed.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export class InvalidServerUrl extends Data.TaggedError('InvalidServerUrl')<{
  url: string
}> {}

/** Failure producing the Flags payload: the Schema encode step rejected the
 *  Flags value, or the encoded value could not be serialized to JSON.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export class ServerFlagsEncodeError extends Data.TaggedError(
  'ServerFlagsEncodeError',
)<{
  cause: unknown
}> {}

/** Failure serializing the view-produced vnode tree to safe HTML.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export class ServerSerializationError extends Data.TaggedError(
  'ServerSerializationError',
)<{
  cause: unknown
}> {}

/** Failure of a render whose `runtimeId` is empty.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export class InvalidRuntimeId extends Data.TaggedError('InvalidRuntimeId')<{
  runtimeId: string
}> {}

/** Failure of a hydratable render whose view did not return an element root.
 * Text, comments, and an empty body cannot carry the hydration marker the
 * client runtime uses to adopt the server-rendered DOM.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export class InvalidHydrationRoot extends Data.TaggedError(
  'InvalidHydrationRoot',
)<{
  rootKind: 'Empty' | 'Text' | 'Comment'
}> {}

/** Union of the failures {@link renderToString} can produce.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type ServerRenderError =
  | InvalidServerUrl
  | ServerFlagsEncodeError
  | ServerSerializationError
  | InvalidRuntimeId
  | InvalidHydrationRoot

type InitReturn<Model> = readonly [Model, ReadonlyArray<unknown>]

/** Server-side subset of a routing `makeApplication` config with Flags. The
 *  full application config is structurally assignable; `container`, `update`,
 *  and `subscriptions` play no part in a server render.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type ServerRoutingApplicationConfigWithFlags<Model, Flags> = Readonly<{
  Flags: Schema.Codec<Flags, any, unknown, never>
  routing: unknown
  init: (flags: Flags, url: Url) => InitReturn<Model>
  view: (model: Model, h: HtmlBuilder<any>) => Document
}>

/** Server-side subset of a routing `makeApplication` config without Flags.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type ServerRoutingApplicationConfig<Model> = Readonly<{
  routing: unknown
  init: (url: Url) => InitReturn<Model>
  view: (model: Model, h: HtmlBuilder<any>) => Document
}>

/** Server-side subset of a non-routing `makeApplication` config with Flags.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type ServerApplicationConfigWithFlags<Model, Flags> = Readonly<{
  Flags: Schema.Codec<Flags, any, unknown, never>
  init: (flags: Flags) => InitReturn<Model>
  view: (model: Model, h: HtmlBuilder<any>) => Document
}>

/** Server-side subset of a non-routing `makeApplication` config.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type ServerApplicationConfig<Model> = Readonly<{
  init: () => InitReturn<Model>
  view: (model: Model, h: HtmlBuilder<any>) => Document
}>

/** Options common to every render. `runtimeId` names the application in the
 *  root stamp and Flags payload; it defaults to `'app'` and must be non-empty.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type RenderOptions = Readonly<{
  runtimeId?: string
  /**
   * Whether the output carries the hydration contract: the
   * `data-foldkit-app` root stamp and, for Flags applications, the Flags
   * payload script. Defaults to `true` for both request-time rendering and
   * build-time static generation. A hydratable static page must use universal,
   * build-stable Flags; resolve visitor-specific browser facts after hydration
   * through Commands or Subscriptions. Pass `false` only when producing static
   * markup that the client will not hydrate.
   */
  isHydratable?: boolean
}>

/** Render options for a routing application, adding the request URL.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type RenderUrlOptions = RenderOptions &
  Readonly<{
    url: string
  }>

/** Render options for a Flags application, adding the per-request Flags.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type RenderFlagsOptions<Flags> = RenderOptions &
  Readonly<{
    flags: Flags
  }>

/** Render options for a routing Flags application: the request URL plus the
 *  per-request Flags.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type RenderUrlFlagsOptions<Flags> = RenderUrlOptions &
  RenderFlagsOptions<Flags>

const noOpDispatch: DispatchSync = () => {}

// NOTE: the html builder reads a process-wide frame stack (`setRuntime` /
// `clearRuntime`), so this bracket is safe only because it is fully
// synchronous: `view` returns a Document without awaiting, and there is no
// yield between push and pop. On one single-threaded runtime, two concurrent
// `renderToString` calls therefore cannot interleave their frames, so no
// per-request context (AsyncLocalStorage) is needed. This mirrors how the
// Scene test harness and the client runtime drive a view. A `view` that
// suspended mid-render would break the invariant; views are pure and cannot.
const runView = <Model>(
  view: (model: Model, h: HtmlBuilder<any>) => Document,
  model: Model,
): Document => {
  const boundaryRegistry = createBoundaryRegistry()
  beginRender(boundaryRegistry)
  setRuntime(noOpDispatch, Context.empty(), boundaryRegistry)
  try {
    return view(model, htmlBuilderFor())
  } finally {
    clearRuntime()
  }
}

const encodeFlagsPayload = <Flags>(
  FlagsCodec: Schema.Codec<Flags, any, unknown, never>,
  flags: Flags,
  runtimeId: string,
): Effect.Effect<string, ServerFlagsEncodeError> =>
  Effect.gen(function* () {
    const FlagsJsonCodec = Schema.toCodecJson(FlagsCodec)
    const encodedFlags = yield* Effect.mapError(
      Schema.encodeEffect(FlagsJsonCodec)(flags),
      cause => new ServerFlagsEncodeError({ cause }),
    )
    const json = yield* Effect.try({
      try: () => JSON.stringify(encodedFlags),
      catch: cause => new ServerFlagsEncodeError({ cause }),
    })
    if (!Predicate.isString(json)) {
      return yield* Effect.fail(
        new ServerFlagsEncodeError({
          cause: new Error(
            'Flags encoded to a value JSON cannot represent, so no payload can be embedded',
          ),
        }),
      )
    }
    const escapedJson = json.replace(/</g, '\\u003c')
    const escapedRuntimeId = escapeAttributeValue(runtimeId)
    return `<script type="application/json" ${FOLDKIT_FLAGS_ATTRIBUTE}="${escapedRuntimeId}">${escapedJson}</script>`
  })

const parseUrl = (url: string): Effect.Effect<Url, InvalidServerUrl> =>
  Option.match(fromString(url), {
    onNone: () => Effect.fail(new InvalidServerUrl({ url })),
    onSome: Effect.succeed,
  })

const validateHydrationRoot = (
  body: Document['body'],
): Effect.Effect<void, InvalidHydrationRoot> => {
  if (body === null) {
    return Effect.fail(new InvalidHydrationRoot({ rootKind: 'Empty' }))
  }

  if (body.sel === undefined || body.sel === '') {
    return Effect.fail(new InvalidHydrationRoot({ rootKind: 'Text' }))
  }

  if (body.sel === '!') {
    return Effect.fail(new InvalidHydrationRoot({ rootKind: 'Comment' }))
  }

  return Effect.void
}

/**
 * Renders a `makeApplication`-shaped config to an HTML string on the server.
 *
 * Resolves `init` for the request (with the given Flags and URL when the
 * config declares them), runs the pure `view` under a no-op dispatch frame,
 * and serializes the resulting `Document` body. The root element is stamped
 * with {@link FOLDKIT_APP_ATTRIBUTE} and, when the config declares `Flags`,
 * the Schema-encoded Flags ride along in a JSON script tag so a hydrating
 * client boots from the same Model.
 *
 * Commands returned by `init` are not run: the rendered HTML is the
 * post-`init` state, and the client runs those Commands after hydration.
 *
 * @example
 * ```typescript
 * const rendered = yield* Server.renderToString(config, {
 *   url: request.url,
 *   flags: { theme },
 * })
 * ```
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export function renderToString<Model, Flags>(
  config: ServerRoutingApplicationConfigWithFlags<Model, Flags>,
  options: RenderUrlFlagsOptions<Flags>,
): Effect.Effect<RenderedApplication, ServerRenderError>
export function renderToString<Model>(
  config: ServerRoutingApplicationConfig<Model>,
  options: RenderUrlOptions,
): Effect.Effect<RenderedApplication, ServerRenderError>
export function renderToString<Model, Flags>(
  config: ServerApplicationConfigWithFlags<Model, Flags>,
  options: RenderFlagsOptions<Flags>,
): Effect.Effect<RenderedApplication, ServerRenderError>
export function renderToString<Model>(
  config: ServerApplicationConfig<Model>,
  options?: RenderOptions,
): Effect.Effect<RenderedApplication, ServerRenderError>
export function renderToString(
  config: Readonly<{
    Flags?: Schema.Codec<unknown, any, unknown, never>
    routing?: unknown
    init: (...initArguments: ReadonlyArray<any>) => InitReturn<unknown>
    view: (model: any, h: HtmlBuilder<any>) => Document
  }>,
  options?: RenderOptions &
    Readonly<{
      url?: string
      flags?: unknown
    }>,
): Effect.Effect<RenderedApplication, ServerRenderError> {
  return Effect.gen(function* () {
    const runtimeId = options?.runtimeId ?? DEFAULT_RUNTIME_ID
    if (runtimeId === '') {
      return yield* Effect.fail(
        new InvalidRuntimeId({
          runtimeId,
        }),
      )
    }
    const hasRouting = config.routing !== undefined
    const FlagsCodec = config.Flags

    const maybeUrl = hasRouting
      ? yield* parseUrl(options?.url ?? '')
      : undefined

    const initReturn = ((): InitReturn<unknown> => {
      if (FlagsCodec !== undefined) {
        return hasRouting
          ? config.init(options?.flags, maybeUrl)
          : config.init(options?.flags)
      }
      return hasRouting ? config.init(maybeUrl) : config.init()
    })()
    const [model] = initReturn

    const nextDocument = runView(config.view, model)

    const isHydratable = options?.isHydratable ?? true

    if (isHydratable) {
      yield* validateHydrationRoot(nextDocument.body)
    }

    const rootHtml = yield* Effect.try({
      try: () =>
        serializeHtml(
          nextDocument.body,
          isHydratable
            ? { rootAttributes: { [FOLDKIT_APP_ATTRIBUTE]: runtimeId } }
            : {},
        ),
      catch: cause => new ServerSerializationError({ cause }),
    })

    const flagsPayload =
      isHydratable && FlagsCodec !== undefined
        ? yield* encodeFlagsPayload(FlagsCodec, options?.flags, runtimeId)
        : ''

    return {
      html: `${rootHtml}${flagsPayload}`,
      title: nextDocument.title,
      ...(nextDocument.lang !== undefined ? { lang: nextDocument.lang } : {}),
      ...(nextDocument.dir !== undefined
        ? { dir: textDirectionToAttribute(nextDocument.dir) }
        : {}),
      ...(nextDocument.canonical !== undefined
        ? { canonical: nextDocument.canonical }
        : {}),
      ...(nextDocument.ogUrl !== undefined
        ? { ogUrl: nextDocument.ogUrl }
        : {}),
    }
  })
}
