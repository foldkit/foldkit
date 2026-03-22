import { Array, Effect, Option } from 'effect'
import { Command, ManagedResource } from 'foldkit'

const CameraStream = ManagedResource.tag<MediaStream>()('CameraStream')

const TakePhoto = Command.define(
  'TakePhoto',
  SucceededTakePhoto,
  CameraUnavailable,
)

const takePhoto = () =>
  TakePhoto(
    Effect.gen(function* () {
      const stream = yield* CameraStream.get

      const maybeTrack = Array.head(stream.getVideoTracks())
      const bitmap = yield* Option.match(maybeTrack, {
        onNone: () => Effect.fail(new Error('No video track available')),
        onSome: track => {
          const imageCapture = new ImageCapture(track)
          return Effect.promise(() => imageCapture.grabFrame())
        },
      })

      return SucceededTakePhoto({ width: bitmap.width, height: bitmap.height })
    }).pipe(
      Effect.catchTag('ResourceNotAvailable', () =>
        Effect.succeed(CameraUnavailable()),
      ),
    ),
  )
