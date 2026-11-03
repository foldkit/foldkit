import { Effect, Option, pipe } from 'effect'
import { Url } from 'foldkit'
import { Server } from 'foldkit/experimental'

import { ApplicationBlock } from './block'
import { bootstrapSearchInput } from './bootstrap'
import { documentHead } from './documentHead'
import { ApplicationRoute, urlToApplicationRoute } from './route'
import { searchInputConfig } from './searchInput'

export const prerenderPaths: ReadonlyArray<string> = ['/']

export const renderDocument: Server.DocumentRenderer = (
  application,
  assets,
) => {
  const documentAssets = import.meta.env.DEV
    ? Server.DocumentAssets.make({
        ...assets,
        stylesheets: [
          `${import.meta.env.BASE_URL}src/client/styles.css?direct`,
          ...assets.stylesheets,
        ],
      })
    : assets

  return Server.renderDocument(application, documentAssets, {
    head: documentHead,
  }).replace(
    '<script type="module"',
    `<script>(${bootstrapSearchInput.toString()})(${JSON.stringify(searchInputConfig)});</script><script type="module"`,
  )
}

export const renderPage = (request: Request): Promise<Server.EntryResult> => {
  const status = pipe(
    Url.fromString(request.url),
    Option.map(urlToApplicationRoute),
    Option.match({
      onNone: () => 404,
      onSome: ApplicationRoute.match({
        Search: () => 200,
        NotFound: () => 404,
      }),
    }),
  )

  return Effect.runPromise(
    Server.renderToString(
      ApplicationBlock,
      { routing: {} },
      { url: request.url },
    ).pipe(Effect.map(application => Server.Rendered(application, { status }))),
  )
}
