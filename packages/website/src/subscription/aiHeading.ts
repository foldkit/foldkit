import { Duration, Effect, Schema as S, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { type Model } from '../main'
import { type Message, ToggledAiHeading } from '../message'

const TOGGLE_INTERVAL_MS = 3000

// NOTE: Suppressed during Playwright prerender so the captured HTML always reflects
// `aiHeadingToggleCount: 0`. Otherwise the 3s tick fires before the capture, baking a
// mid-flip solari state into the HTML and causing a hydration diff on first client render.
const isPrerender = window.__FOLDKIT_PRERENDER__ === true

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  aiHeading: entry(
    { isLandingPage: S.Boolean },
    {
      modelToDependencies: model => ({
        isLandingPage: model.route._tag === 'Home',
      }),
      dependenciesToStream: ({ isLandingPage }) =>
        Stream.when(
          Stream.tick(Duration.millis(TOGGLE_INTERVAL_MS)).pipe(
            Stream.map(ToggledAiHeading),
          ),
          Effect.sync(() => isLandingPage && !isPrerender),
        ),
    },
  ),
}))
