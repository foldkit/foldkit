import { Effect, Schema } from 'effect'
import { pushUrl } from 'foldkit/navigation'

import { peopleRouter } from '../../route'
import { makeCommand } from './block'
import { Message } from './message'
import { SEARCH_LATENCY, searchPeople } from './model'

export const PushSearchUrl = makeCommand('PushSearchUrl', {
  args: { searchText: Schema.Option(Schema.String) },
  messages: [Message.CompletedPushSearchUrl],
  handler: function* () {
    return ({ searchText }) =>
      pushUrl(peopleRouter({ searchText })).pipe(
        Effect.as(Message.CompletedPushSearchUrl()),
      )
  },
})

export const FetchPeople = makeCommand('FetchPeople', {
  args: { searchText: Schema.String },
  messages: [Message.CompletedFetchPeople],
  handler: function* () {
    return ({ searchText }) =>
      Effect.sleep(SEARCH_LATENCY).pipe(
        Effect.as(
          Message.CompletedFetchPeople({
            query: searchText,
            people: searchPeople(searchText),
          }),
        ),
      )
  },
})
