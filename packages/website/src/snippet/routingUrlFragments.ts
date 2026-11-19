import { Effect, Option, Schema } from 'effect'
import { Command, Dom, Runtime } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { Url } from 'foldkit/url'

// One Command scrolls to the top of a new page...
const ScrollToTop = Command.define('ScrollToTop', {
  messages: [Message.CompletedScrollToTop],
  execute: Effect.sync(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    return Message.CompletedScrollToTop()
  }),
})

// ...another lands on the fragment after paint and moves focus to it...
const ScrollToAnchor = Command.define('ScrollToAnchor', {
  args: { hash: Schema.String },
  messages: [Message.CompletedScrollToAnchor],
  execute: ({ hash }) =>
    Effect.gen(function* () {
      const target = `#${CSS.escape(hash)}`
      yield* Dom.scrollIntoViewAfterPaint(target, { block: 'start' })
      yield* Dom.focus(target, { preventScroll: true, makeFocusable: true })
    }).pipe(Effect.ignore, Effect.as(Message.CompletedScrollToAnchor())),
})

// ...init lands on the fragment of a shared link...
const init: Runtime.RoutingApplicationInit<Model, Message> = (url: Url) => {
  const route = urlToAppRoute(url)

  return {
    model: { route, url },
    commands: [
      ...commandsForRoute(route),
      ...Option.match(url.hash, {
        onNone: () => [],
        onSome: hash => [ScrollToAnchor({ hash })],
      }),
    ],
  }
}

// ...and the ChangedUrl handler lands on it after navigation:
ChangedUrl: ({ url }) => {
  const route = urlToAppRoute(url)

  const maybeScrollToTop = Option.liftPredicate(
    ScrollToTop(),
    () => model.url.pathname !== url.pathname,
  )

  return {
    model: modifyFields(model, { route: () => route, url: () => url }),
    commands: [
      ...commandsForRoute(route),
      ...Option.match(url.hash, {
        onNone: () => Option.toArray(maybeScrollToTop),
        onSome: hash => [ScrollToAnchor({ hash })],
      }),
    ],
  }
}
