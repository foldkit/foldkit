import { Effect, Equal, Match, Option } from 'effect'
import { Command, Render, Runtime } from 'foldkit'
import {
  type LoadType,
  ScrollPosition,
  UrlChangeType,
} from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'
import { Url } from 'foldkit/url'

// One Command turns off the browser's own scroll restoration...
const DisableBrowserScrollRestoration = Command.define(
  'DisableBrowserScrollRestoration',
  {
    messages: [Message.CompletedDisableBrowserScrollRestoration],
    execute: Effect.sync(() => {
      window.history.scrollRestoration = 'manual'
      return Message.CompletedDisableBrowserScrollRestoration()
    }),
  },
)

// ...another scrolls to the top of a new page...
const ScrollToTop = Command.define('ScrollToTop', {
  messages: [Message.CompletedScrollToTop],
  execute: Effect.sync(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    return Message.CompletedScrollToTop()
  }),
})

// ...and a third puts the reader back once the page has rendered...
const RestoreScrollPosition = Command.define('RestoreScrollPosition', {
  args: ScrollPosition.fields,
  messages: [Message.CompletedRestoreScrollPosition],
  execute: ({ x, y }) =>
    Effect.gen(function* () {
      yield* Render.afterCommit
      window.scrollTo({ left: x, top: y, behavior: 'instant' })
      return Message.CompletedRestoreScrollPosition()
    }),
})

// ...when a position was recorded for the entry:
const restoreScrollPositionCommands = (
  maybeSavedScrollPosition: Option.Option<ScrollPosition>,
): ReadonlyArray<Command.Command<Message>> =>
  Option.toArray(Option.map(maybeSavedScrollPosition, RestoreScrollPosition))

// init restores after a reload, or after Back or Forward into the app...
const init: Runtime.RoutingApplicationInit<Model, Message> = (
  url: Url,
  loadType: LoadType,
) => ({
  model: { route: urlToAppRoute(url) },
  commands: [
    DisableBrowserScrollRestoration(),
    ...Match.value(loadType).pipe(
      Match.withReturnType<ReadonlyArray<Command.Command<Message>>>(),
      Match.tag('Push', () => []),
      Match.tag('Reload', 'Traverse', ({ maybeSavedScrollPosition }) =>
        restoreScrollPositionCommands(maybeSavedScrollPosition),
      ),
      Match.exhaustive,
    ),
  ],
})

// ...and the ChangedUrl handler decides for every navigation after that:
ChangedUrl: ({ url, urlChangeType }) => {
  const nextRoute = urlToAppRoute(url)

  return {
    model: modifyFields(model, { route: () => nextRoute }),
    commands: UrlChangeType.match(urlChangeType, {
      Push: () =>
        Option.toArray(
          Option.liftPredicate(
            ScrollToTop(),
            () => !Equal.equals(nextRoute, model.route),
          ),
        ),
      Replace: () => [],
      Traverse: ({ maybeSavedScrollPosition }) =>
        restoreScrollPositionCommands(maybeSavedScrollPosition),
    }),
  }
}
