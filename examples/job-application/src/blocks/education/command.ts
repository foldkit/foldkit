import { Effect } from 'effect'
import { SecureRandom } from 'effect/crypto'

import { EducationBlock, Message } from './definition'

export const GenerateEducationEntryId = EducationBlock.makeCommand(
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

export const EffectsLayer = GenerateEducationEntryId.layer
