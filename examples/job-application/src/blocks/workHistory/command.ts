import { Effect } from 'effect'
import { SecureRandom } from 'effect/crypto'

import { Message, makeCommand } from './block'

export const GenerateWorkHistoryEntryId = makeCommand(
  'GenerateWorkHistoryEntryId',
  {
    messages: [Message.CompletedGenerateWorkHistoryEntryId],
    handler: function* () {
      const secureRandom = yield* SecureRandom.SecureRandom

      return () =>
        secureRandom
          .uuidV4()
          .pipe(
            Effect.map(entryId =>
              Message.CompletedGenerateWorkHistoryEntryId({ entryId }),
            ),
          )
    },
  },
)
