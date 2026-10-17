import { Array, Effect, Option } from 'effect'

import { Message } from './message'
import { Camera, CameraStream } from './resource'

export const TakePhoto = Camera.command('TakePhoto', {
  messages: [Message.SucceededTakePhoto, Message.FailedTakePhoto],
  handler: function* () {
    return () =>
      Effect.gen(function* () {
        const stream = yield* CameraStream.get

        const maybeTrack = Array.head(stream.getVideoTracks())
        return yield* Effect.acquireUseRelease(
          Option.match(maybeTrack, {
            onNone: () => Effect.fail(new Error('No video track available')),
            onSome: track => {
              const imageCapture = new ImageCapture(track)
              return Effect.tryPromise(() => imageCapture.grabFrame())
            },
          }),
          bitmap =>
            Effect.succeed(
              Message.SucceededTakePhoto({
                width: bitmap.width,
                height: bitmap.height,
              }),
            ),
          bitmap => Effect.sync(() => bitmap.close()),
        )
      }).pipe(Effect.catch(() => Effect.succeed(Message.FailedTakePhoto())))
  },
})
