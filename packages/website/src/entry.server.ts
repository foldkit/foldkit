import { DateTime, Effect, Option, Record, Schema } from 'effect'
import { Calendar } from 'foldkit'
import { Server } from 'foldkit/experimental'
import { fromString as urlFromString } from 'foldkit/url'

import { deployment } from './deployment'
import { Flags, init, view } from './main'
import { ApiReference, Example } from './page'
import { urlToAppRoute } from './route'

type SourcesBySlug = Readonly<globalThis.Record<string, Example.ExampleSources>>

const baseFlags: Effect.Effect<typeof Flags.Type> = Effect.gen(function* () {
  const currentYear = yield* DateTime.now.pipe(
    Effect.map(DateTime.getPartUtc('year')),
  )
  const today = yield* Calendar.today.local

  return Flags.make({
    currentYear,
    today,
    deployment,
    maybeApiData: Option.none(),
    maybeExampleSources: Option.none(),
  })
})

// NOTE: the same data the LoadApiData and LoadExampleSources Commands import
// lazily in the browser, loaded eagerly here so the prerendered Model carries
// full page content instead of the Commands' loading states.
const loadApiData: Effect.Effect<ApiReference.ApiData> = Effect.map(
  Effect.promise(() =>
    Promise.all([
      import('virtual:parsed-api'),
      import('virtual:api-highlights'),
    ]),
  ),
  ([parsedApiModule, highlightsModule]) => ({
    parsedApi: Schema.decodeUnknownSync(ApiReference.ParsedApiReference)(
      parsedApiModule.default,
    ),
    highlights: highlightsModule.default,
  }),
)

const loadAllExampleSources: Effect.Effect<SourcesBySlug> = Effect.map(
  Effect.promise(() =>
    Promise.all(
      Example.exampleSlugs.map(
        async (slug): Promise<readonly [string, Example.ExampleSources]> => [
          slug,
          await Example.loadSourcesForSlug(slug),
        ],
      ),
    ),
  ),
  Record.fromEntries,
)

const flagsForRequest = (
  baseFlags: typeof Flags.Type,
  apiData: ApiReference.ApiData,
  sourcesBySlug: SourcesBySlug,
  request: Request,
): typeof Flags.Type => {
  const route = Option.match(urlFromString(request.url), {
    onNone: () => {
      throw new Error(`Cannot render the invalid URL "${request.url}".`)
    },
    onSome: urlToAppRoute,
  })

  return Flags.make({
    ...baseFlags,
    maybeApiData: Option.liftPredicate(
      route,
      candidate => candidate._tag === 'ApiModule',
    ).pipe(
      Option.flatMap(({ moduleSlug }) =>
        ApiReference.sliceApiDataToModule(apiData, moduleSlug),
      ),
    ),
    maybeExampleSources: Option.liftPredicate(
      route,
      candidate => candidate._tag === 'ExampleDetail',
    ).pipe(
      Option.flatMap(({ exampleSlug }) =>
        Record.get(sourcesBySlug, exampleSlug),
      ),
    ),
  })
}

type RenderContext = Readonly<{
  apiData: ApiReference.ApiData
  sourcesBySlug: SourcesBySlug
  baseFlags: typeof Flags.Type
}>

// NOTE: the context loads on the first renderPage call, not at module scope.
// An eager module-scope Effect.runPromise rejects with no awaiting caller
// when a load fails, killing the host process as an opaque unhandled
// rejection, and dev HMR reloads of this module would re-pay the full load.
const makeRenderContextLoader = (): (() => Promise<RenderContext>) => {
  let renderContextPromise: Promise<RenderContext> | undefined
  return () => {
    renderContextPromise ??= Effect.runPromise(
      Effect.all({
        apiData: loadApiData,
        sourcesBySlug: loadAllExampleSources,
        baseFlags,
      }),
    ).catch((error: unknown) => {
      renderContextPromise = undefined
      throw error
    })
    return renderContextPromise
  }
}

const loadRenderContext = makeRenderContextLoader()

// NOTE: rendering stays in this bundle so the application view and server
// renderer share the module-local HTML render frame. The expensive content
// inputs are loaded once, then reused across every URL in the build.
export const renderPage = (request: Request): Promise<Server.EntryResult> =>
  loadRenderContext().then(({ apiData, sourcesBySlug, baseFlags }) => {
    const requestFlags = flagsForRequest(
      baseFlags,
      apiData,
      sourcesBySlug,
      request,
    )
    return Effect.runPromise(
      Server.renderToString(
        { Flags, routing: {}, init, view },
        {
          url: request.url,
          flags: requestFlags,
          buildId: import.meta.env.FOLDKIT_BUILD_ID,
        },
      ).pipe(Effect.map(Server.Rendered)),
    )
  })
