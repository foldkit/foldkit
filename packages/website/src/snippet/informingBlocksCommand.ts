import { Effect, Schema } from 'effect'

import { makeCommand } from './informingBlocksDefinition'
import { Message } from './informingBlocksMessage'
import { PeopleDirectory } from './informingBlocksService'

export const FetchPeople = makeCommand('FetchPeople', {
  args: { searchText: Schema.String },
  messages: [Message.CompletedFetchPeople],
  handler: function* () {
    const directory = yield* PeopleDirectory

    return ({ searchText }) =>
      directory
        .search(searchText)
        .pipe(
          Effect.map(people =>
            Message.CompletedFetchPeople({ query: searchText, people }),
          ),
        )
  },
})
