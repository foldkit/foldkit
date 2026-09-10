import { Array, String } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import {
  Message,
  Model,
  PushSearchUrl,
  SearchResults,
  searchPeople,
  update,
} from './people'

const givenLoaded = (searchInput: string) =>
  given(
    Model.make({
      searchInput,
      searchHistory: Array.liftPredicate(String.isNonEmpty)(searchInput),
      results: SearchResults.Loaded({
        query: searchInput,
        people: searchPeople(searchInput),
      }),
    }),
  )

describe('people', () => {
  test('ChangedSearchInput updates the input without recording history or fetching', () => {
    story(
      update,
      givenLoaded(''),
      message(Message.ChangedSearchInput({ value: 'd' })),
      message(Message.ChangedSearchInput({ value: 'de' })),
      message(Message.ChangedSearchInput({ value: 'designer' })),
      Command.expectNone(),
      model(model => {
        expect(model.searchInput).toBe('designer')
        expect(model.searchHistory).toStrictEqual([])
      }),
    )
  })

  test('SubmittedSearch pushes the current input to the URL', () => {
    story(
      update,
      givenLoaded('designer'),
      message(Message.SubmittedSearch()),
      Command.expectHas(PushSearchUrl),
      Command.resolve(PushSearchUrl, Message.CompletedPushSearchUrl()),
    )
  })

  test('SucceededFetchPeople stores the loaded results', () => {
    const people = searchPeople('designer')

    story(
      update,
      givenLoaded(''),
      message(
        Message.SucceededFetchPeople({
          query: 'designer',
          people,
        }),
      ),
      model(model => {
        expect(model.results._tag).toBe('Loaded')
        if (model.results._tag === 'Loaded') {
          expect(model.results.query).toBe('designer')
          expect(model.results.people).toStrictEqual(people)
        }
      }),
    )
  })
})
