import { Effect } from 'effect'
import { SecureRandom } from 'effect/crypto'

import { Message, SkillsDefinition } from './definition'

export const GenerateSkillsEntryId = SkillsDefinition.makeCommand(
  'GenerateSkillsEntryId',
  {
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
  },
)

export const EffectsLayer = GenerateSkillsEntryId.layer
