import { Match, Option } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'

// A handler is a pure translator from event data to a Message.
// It can branch as much as it needs to, with Model-derived state
// in scope.
const searchResultsView = (model: Model, h: HtmlBuilder<Message>) => {
  const handleResultsKeyDown = (key: string): Option.Option<Message> =>
    Match.value(key).pipe(
      Match.when('Escape', () => Option.some(DismissedResults())),
      Match.when('Enter', () =>
        Option.map(model.maybeActiveIndex, index => SelectedResult({ index })),
      ),
      Match.when('ArrowDown', () => Option.some(ActivatedNextResult())),
      Match.when('ArrowUp', () => Option.some(ActivatedPreviousResult())),
      // Every other key stays with the browser: no Message,
      // no preventDefault.
      Match.orElse(() => Option.none()),
    )

  return h.ul(
    [
      h.Role('listbox'),
      h.Tabindex(0),
      h.OnKeyDownPreventDefault(handleResultsKeyDown),
    ],
    model.results.map(result => resultView(result, h)),
  )
}
