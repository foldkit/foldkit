import { Array, Effect, String } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { PeopleBlock, layer } from './people/block'
import { PushSearchUrl } from './people/command'
import { Message } from './people/message'
import { Model, SearchResults, searchPeople } from './people/model'

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
  test('ChangedSearchInput updates the input without recording history or fetching', async () => {
    await Effect.runPromise(
      story(
        PeopleBlock,
        givenLoaded(''),
        message(Message.ChangedSearchInput({ value: 'd' })),
        message(Message.ChangedSearchInput({ value: 'de' })),
        message(Message.ChangedSearchInput({ value: 'designer' })),
        Command.expectNone(),
        model(model => {
          expect(model.searchInput).toBe('designer')
          expect(model.searchHistory).toStrictEqual([])
        }),
      ).pipe(Effect.provide(layer)),
    )
  })

  test('SubmittedSearch pushes the current input to the URL', async () => {
    await Effect.runPromise(
      story(
        PeopleBlock,
        givenLoaded('designer'),
        message(Message.SubmittedSearch()),
        Command.expectHas(PushSearchUrl),
        Command.resolve(PushSearchUrl, Message.CompletedPushSearchUrl()),
      ).pipe(Effect.provide(layer)),
    )
  })

  test('CompletedFetchPeople stores the loaded results', async () => {
    const people = searchPeople('designer')

    await Effect.runPromise(
      story(
        PeopleBlock,
        givenLoaded(''),
        message(
          Message.CompletedFetchPeople({
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
      ).pipe(Effect.provide(layer)),
    )
  })
})
