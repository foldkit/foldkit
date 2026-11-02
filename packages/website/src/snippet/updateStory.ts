import { Effect, Layer } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'

import { expect, it } from '@effect/vitest'

import { Catalog, Search, SearchCatalog } from './updateSearchContract'
import { SearchLive } from './updateSharedSteps'

const CatalogTest = Layer.succeed(Catalog, {
  search: () => Effect.succeed([]),
})

it.effect('a new query returns to the first page and searches', () =>
  story(
    SearchLive,
    given({ query: 'tea', page: 4, results: ['Green tea'] }),
    message(Search.Message.UpdatedQuery({ value: 'coffee' })),
    model(model => {
      expect(model.query).toBe('coffee')
      expect(model.page).toBe(1)
    }),
    Command.expectExact(SearchCatalog({ query: 'coffee', page: 1 })),
    Command.resolve(
      SearchCatalog,
      Search.Message.SucceededSearch({ results: ['Cold brew'] }),
    ),
    model(model => expect(model.results).toEqual(['Cold brew'])),
  ).pipe(Effect.provide(CatalogTest)),
)
