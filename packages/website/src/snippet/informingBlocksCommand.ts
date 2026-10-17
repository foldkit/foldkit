import { Effect, Schema } from 'effect'

import { People } from './informingBlocksDefinition'
import { Message } from './informingBlocksMessage'
import { PeopleDirectory } from './informingBlocksService'

export const FetchPeople = People.command('FetchPeople', {
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
