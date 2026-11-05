import { Effect } from 'effect'
import { SecureRandom } from 'effect/crypto'

import { Message, makeCommand } from './block'

export const GenerateEducationEntryId = makeCommand(
  'GenerateEducationEntryId',
  {
    messages: [Message.CompletedGenerateEducationEntryId],
    handler: function* () {
      const secureRandom = yield* SecureRandom.SecureRandom

      return () =>
        secureRandom
          .uuidV4()
          .pipe(
            Effect.map(entryId =>
              Message.CompletedGenerateEducationEntryId({ entryId }),
            ),
          )
    },
  },
)
