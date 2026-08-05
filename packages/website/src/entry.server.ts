import {
  DateTime,
  Effect,
  Option,
  Record as Record_,
  Schema as S,
} from 'effect'
import { Calendar } from 'foldkit'
import * as Server from 'foldkit/experimental/server'
import { fromString as urlFromString } from 'foldkit/url'

import { Flags, init, view } from './main'
import { ParsedApiReference } from './page/apiReference/domain'
import { type ApiData } from './page/apiReference/model'
import { exampleSlugs } from './page/example/meta'
import { type ExampleSources, loadSourcesForSlug } from './page/example/sources'
import { urlToAppRoute } from './route'

type SourcesBySlug = Readonly<Record<string, ExampleSources>>

const baseFlags: Effect.Effect<typeof Flags.Type> = Effect.gen(function* () {
  const currentYear = yield* DateTime.now.pipe(
    Effect.map(DateTime.getPartUtc('year')),
  )
  const today = yield* Calendar.today.local

  return Flags.make({
    currentYear,
    today,
    maybeApiData: Option.none(),
    maybeExampleSources: Option.none(),
  })
})

// NOTE: the same data the LoadApiData and LoadExampleSources Commands import
// lazily in the browser, loaded eagerly here so the prerendered Model carries
// full page content instead of the Commands' loading states.
const loadApiData: Effect.Effect<ApiData> = Effect.map(
  Effect.promise(() =>
    Promise.all([
      import('virtual:parsed-api'),
      import('virtual:api-highlights'),
    ]),
  ),
  ([parsedApiModule, highlightsModule]) => ({
    parsedApi: S.decodeUnknownSync(ParsedApiReference)(parsedApiModule.default),
    highlights: highlightsModule.default,
  }),
)

const loadAllExampleSources: Effect.Effect<SourcesBySlug> = Effect.map(
  Effect.promise(() =>
    Promise.all(
      exampleSlugs.map(
        async (slug): Promise<readonly [string, ExampleSources]> => [
          slug,
          await loadSourcesForSlug(slug),
        ],
      ),
    ),
  ),
  Record_.fromEntries,
)

const flagsForRequest = (
  baseFlags: typeof Flags.Type,
  apiData: ApiData,
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
    maybeApiData:
      route._tag === 'ApiModule' ? Option.some(apiData) : Option.none(),
    maybeExampleSources:
      route._tag === 'ExampleDetail'
        ? Record_.get(sourcesBySlug, route.exampleSlug)
        : Option.none(),
  })
}

const renderContext = Effect.runPromise(
  Effect.all({
    apiData: loadApiData,
    sourcesBySlug: loadAllExampleSources,
    baseFlags,
  }),
)

// NOTE: rendering stays in this bundle so the application view and server
// renderer share the module-local HTML render frame. The expensive content
// inputs are loaded once, then reused across every URL in the build.
export const renderPage = (
  request: Request,
): Promise<Server.ServerEntryResult> =>
  renderContext.then(({ apiData, sourcesBySlug, baseFlags }) => {
    const requestFlags = flagsForRequest(
      baseFlags,
      apiData,
      sourcesBySlug,
      request,
    )
    return Effect.runPromise(
      Server.renderToString(
        { Flags, routing: {}, init, view },
        { url: request.url, flags: requestFlags },
      ).pipe(Effect.map(Server.Rendered)),
    )
  })
