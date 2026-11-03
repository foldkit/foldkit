import { Effect } from 'effect'
import { SecureRandom } from 'effect/crypto'

import { EducationDefinition, Message } from './definition'

export const GenerateEducationEntryId = EducationDefinition.makeCommand(
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
