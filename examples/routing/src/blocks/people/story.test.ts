import { Array, String } from 'effect'
import { Story } from 'foldkit'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { PushSearchUrl } from './command'
import { PeopleBlock, layer } from './index'
import { Message } from './message'
import { Model, SearchResults, searchPeople } from './model'

const givenLoaded = (searchInput: string) =>
  Story.given(
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
      Story.story(
        { block: PeopleBlock, layer },
        givenLoaded(''),
        Story.message(Message.ChangedSearchInput({ value: 'd' })),
        Story.message(Message.ChangedSearchInput({ value: 'de' })),
        Story.message(Message.ChangedSearchInput({ value: 'designer' })),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.searchInput).toBe('designer')
          expect(model.searchHistory).toStrictEqual([])
        }),
      ),
  )

  it.effect('SubmittedSearch pushes the current input to the URL', () =>
    Story.story(
      { block: PeopleBlock, layer },
      givenLoaded('designer'),
      Story.message(Message.SubmittedSearch()),
      Story.Command.expectHas(PushSearchUrl),
      Story.Command.resolve(PushSearchUrl, Message.CompletedPushSearchUrl()),
    ),
  )

  it.effect('CompletedFetchPeople stores the loaded results', () => {
    const people = searchPeople('designer')

    return Story.story(
      { block: PeopleBlock, layer },
      givenLoaded(''),
      Story.message(
        Message.CompletedFetchPeople({
          query: 'designer',
          people,
        }),
      ),
      Story.model(model => {
        expect(model.results._tag).toBe('Loaded')
        if (model.results._tag === 'Loaded') {
          expect(model.results.query).toBe('designer')
          expect(model.results.people).toStrictEqual(people)
        }
      }),
    )
  })
})
