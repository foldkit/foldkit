import { Duration, Effect, Schema } from 'effect'

import { ApplicationDefinition } from './definition'
import { Message } from './message'

const MILLISECONDS_PER_MEGABYTE = 100

export const UploadKey = Schema.Struct({ uploadId: Schema.Number })
export type UploadKey = typeof UploadKey.Type

export const UploadFile = ApplicationDefinition.makeCommand('UploadFile', {
  args: { ...UploadKey.fields, sizeMegabytes: Schema.Number },
  messages: [Message.CompletedUploadFile],
  interrupt: {
    keyFields: ['uploadId'],
    toKey: ({ uploadId }) => String(uploadId),
  },
  handler: function* () {
    return ({ uploadId, sizeMegabytes }) =>
      Effect.gen(function* () {
        yield* Effect.sleep(
          Duration.millis(sizeMegabytes * MILLISECONDS_PER_MEGABYTE),
        )
        return Message.CompletedUploadFile({ uploadId })
      })
  },
})

export const CancelUploadFile = ({ uploadId }: UploadKey) =>
  UploadFile.Interrupt({ uploadId }, outcome =>
    Message.CompletedCancelUploadFile({ uploadId, outcome }),
  )

export const EffectsLayer = UploadFile.layer
