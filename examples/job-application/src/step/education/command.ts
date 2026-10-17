import { Crypto, Effect } from 'effect'

import { Education, Message } from './definition'

export const GenerateEducationEntryId = Education.command(
  'GenerateEducationEntryId',
  {
    messages: [
      Message.SucceededGenerateEducationEntryId,
      Message.FailedGenerateEducationEntryId,
    ],
    handler: function* () {
      const crypto = yield* Crypto.Crypto

      return () =>
        crypto.randomUUIDv4.pipe(
          Effect.map(entryId =>
            Message.SucceededGenerateEducationEntryId({ entryId }),
          ),
          Effect.catch(() =>
            Effect.succeed(Message.FailedGenerateEducationEntryId()),
          ),
        )
    },
  },
)

export const EffectsLayer = GenerateEducationEntryId.layer
