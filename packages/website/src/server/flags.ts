import { DateTime, Effect, Option, Record, Schema } from 'effect'
import { Calendar } from 'foldkit'
import { fromString as urlFromString } from 'foldkit/url'

import { deployment } from '../deployment'
import { Flags } from '../main'
import { ApiReference, Example } from '../page'
import { AppRoute, urlToAppRoute } from '../route'

type SourcesBySlug = Readonly<globalThis.Record<string, Example.ExampleSources>>

type RenderContext = Readonly<{
  apiData: ApiReference.ApiData
  sourcesBySlug: SourcesBySlug
  baseFlags: typeof Flags.Type
}>

const loadBaseFlags: Effect.Effect<typeof Flags.Type> = Effect.gen(
  function* () {
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
  },
)

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
      Example.runnableExampleSlugs.map(
        async (slug): Promise<readonly [string, Example.ExampleSources]> => [
          slug,
          await Example.loadSourcesForSlug(slug),
        ],
      ),
    ),
  ),
  Record.fromEntries,
)

// NOTE: Browser Commands load this content lazily, but prerendering needs it
// before init so the HTML contains each page's content instead of a loading state.
const prepareRenderContext = Effect.all({
  apiData: loadApiData,
  sourcesBySlug: loadAllExampleSources,
  baseFlags: loadBaseFlags,
})

// NOTE: Content loads on the first request so a failed load has an awaiting
// caller. A failed load clears the cache so the next request can retry.
const makeRenderContextLoader = (): (() => Promise<RenderContext>) => {
  let renderContextPromise: Promise<RenderContext> | undefined

  return () => {
    renderContextPromise ??= Effect.runPromise(prepareRenderContext).catch(
      (error: unknown) => {
        renderContextPromise = undefined
        throw error
      },
    )

    return renderContextPromise
  }
}

const loadRenderContext = makeRenderContextLoader()

const flagsForRequest = (
  { apiData, sourcesBySlug, baseFlags }: RenderContext,
  request: Request,
): typeof Flags.Type => {
  const route = Option.match(urlFromString(request.url), {
    onNone: () => {
      throw new Error(`Cannot render the invalid URL "${request.url}".`)
    },
    onSome: urlToAppRoute,
  })

  return AppRoute.matchOrElse<typeof Flags.Type>(
    route,
    {
      ApiModule: ({ moduleSlug }) =>
        Flags.make({
          ...baseFlags,
          maybeApiData: ApiReference.sliceApiDataToModule(apiData, moduleSlug),
        }),
      ExampleDetail: ({ exampleSlug }) =>
        Flags.make({
          ...baseFlags,
          maybeExampleSources: Record.get(sourcesBySlug, exampleSlug),
        }),
    },
    () => baseFlags,
  )
}

export const loadFlagsForRequest = async (
  request: Request,
): Promise<typeof Flags.Type> => {
  const context = await loadRenderContext()

  return flagsForRequest(context, request)
}
