import { Effect, Layer } from 'effect'
import { Http, Runtime } from 'foldkit'

import { Flags, Message, Model, init, subscriptions, update } from './main'
import { PokeApiLive } from './pokeApi'
import { view } from './view'

const APPLE_PLATFORM_PATTERN = /Mac|iPhone|iPad|iPod/

const flags = Effect.sync(() =>
  Flags.make({
    shortcutPlatform: APPLE_PLATFORM_PATTERN.test(navigator.userAgent)
      ? 'Apple'
      : 'Other',
  }),
)

const application = Runtime.makeApplication({
  Model,
  Flags,
  init,
  update,
  subscriptions,
  view,
  resources: PokeApiLive.pipe(Layer.provide(Http.layer)),
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: request => Message.ClickedLink({ request }),
    onUrlChange: url => Message.ChangedUrl({ url }),
  },
  devTools: {
    Message,
  },
})

Runtime.run(application, { flags })
