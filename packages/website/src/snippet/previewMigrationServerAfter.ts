import { Effect, Layer } from 'effect'
import { Server } from 'foldkit/experimental'

import { SettingsStore } from './previewMigrationCommandAfter'
import {
  Application,
  ApplicationLive,
  Flags,
} from './previewMigrationRootAfter'

const ServerLayer = Layer.succeed(SettingsStore, {
  saveTheme: () => Effect.void,
})

export const renderDocument = Server.renderDocument

export const renderPage = (request: Request): Promise<Server.EntryResult> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const renderedApplication = yield* Server.renderToString(
        Application,
        { layer: ApplicationLive.pipe(Layer.provide(ServerLayer)), Flags },
        {
          flags: Flags.make({
            savedTheme:
              request.headers.get('sec-ch-prefers-color-scheme') === 'dark'
                ? 'Dark'
                : 'System',
          }),
        },
      )

      return Server.Rendered(renderedApplication, {
        headers: { 'cache-control': 'private, no-store' },
      })
    }),
  )
