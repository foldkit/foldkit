import { Match } from 'effect'
import { evo } from 'foldkit/struct'

import { fetchUser } from './command'
import { Message } from './message'
import { Model } from './model'

// ✅ Update returns new state and commands
const update = (model: Model, message: Message) =>
  Match.value(message).pipe(
    Match.tagsExhaustive({
      ClickedFetchUser: () => [
        evo(model, { isLoading: () => true }),
        [fetchUser(model.userId)], // Command handles the side effect
      ],

      SucceededFetchUser: ({ user }) => [
        evo(model, { isLoading: () => false, user: () => user }),
        [], // Result received, no more commands needed
      ],
    }),
  )
