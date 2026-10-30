import { Effect } from 'effect'
import { modifyFields } from 'foldkit/struct'

import {
  Catalog,
  type Model,
  Search,
  SearchCatalog,
} from './updateSearchContract'

const resetPage = (model: Model): Model =>
  modifyFields(model, { page: () => 1 })

const searchStep = (model: Model) => ({
  model,
  commands: [SearchCatalog({ query: model.query, page: model.page })],
})

export const SearchLive = Search.make(
  Effect.fn(function* () {
    const catalog = yield* Catalog

    return {
      model: { query: '', page: 1, results: [] },

      update: {
        UpdatedQuery: (model, { value }) =>
          searchStep(resetPage(modifyFields(model, { query: () => value }))),
        ClickedClear: model => ({
          model: resetPage(modifyFields(model, { query: () => '' })),
        }),
        ClickedResult: (model, { title }) => ({
          model,
          outMessage: Search.OutMessage.ChoseResult({ title }),
        }),
        SucceededSearch: (model, { results }) => ({
          model: modifyFields(model, { results: () => results }),
        }),
        FailedSearch: model => ({
          model: modifyFields(model, { results: () => [] }),
        }),
      },

      commands: {
        SearchCatalog: ({ query, page }) =>
          catalog.search(query, page).pipe(
            Effect.map(results => Search.Message.SucceededSearch({ results })),
            Effect.catch(() => Effect.succeed(Search.Message.FailedSearch())),
          ),
      },
    }
  }),
)
