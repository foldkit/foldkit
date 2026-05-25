import { Match as M, Option } from 'effect'
import { Command } from 'foldkit'
import { evo } from 'foldkit/struct'

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.tagsExhaustive({
      ChangedSearchInput: ({ value }) => [
        evo(model, { searchInput: () => value }),
        [ReplaceSearchUrl({ searchText: Option.fromNullishOr(value || null) })],
      ],

      ChangedRoute: ({ route }) => {
        const incoming = Option.getOrElse(route.searchText, () => '')
        return [
          evo(model, {
            searchInput: () => incoming,
            searchHistory: () => addToHistory(model.searchHistory, incoming),
          }),
          [],
        ]
      },
    }),
  )
