import { Effect } from 'effect'
import { SecureRandom } from 'effect/crypto'

import { Message, makeCommand } from './block'

export const GenerateSkillsEntryId = makeCommand('GenerateSkillsEntryId', {
  messages: [Message.CompletedGenerateSkillsEntryId],
  handler: function* () {
    const secureRandom = yield* SecureRandom.SecureRandom

    return () =>
      secureRandom
        .uuidV4()
        .pipe(
          Effect.map(entryId =>
            Message.CompletedGenerateSkillsEntryId({ entryId }),
          ),
        )
  },
})
