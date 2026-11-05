import { Array, String } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { PushSearchUrl } from './command'
import { PeopleBlock, layer } from './index'
import { Message } from './message'
import { Model, SearchResults, searchPeople } from './model'

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
  it.effect(
    'ChangedSearchInput updates the input without recording history or fetching',
    () =>
      story(
        { block: PeopleBlock, layer },
        givenLoaded(''),
        message(Message.ChangedSearchInput({ value: 'd' })),
        message(Message.ChangedSearchInput({ value: 'de' })),
        message(Message.ChangedSearchInput({ value: 'designer' })),
        Command.expectNone(),
        model(model => {
          expect(model.searchInput).toBe('designer')
          expect(model.searchHistory).toStrictEqual([])
        }),
      ),
  )

  it.effect('SubmittedSearch pushes the current input to the URL', () =>
    story(
      { block: PeopleBlock, layer },
      givenLoaded('designer'),
      message(Message.SubmittedSearch()),
      Command.expectHas(PushSearchUrl),
      Command.resolve(PushSearchUrl, Message.CompletedPushSearchUrl()),
    ),
  )

  it.effect('CompletedFetchPeople stores the loaded results', () => {
    const people = searchPeople('designer')

    return story(
      { block: PeopleBlock, layer },
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
    )
  })
})
