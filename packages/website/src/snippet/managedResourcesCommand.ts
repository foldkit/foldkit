import { Array, Effect, Option } from 'effect'
import { ManagedResource } from 'foldkit'
import { Command } from 'foldkit/command'

const CameraStream = ManagedResource.tag<MediaStream>()('CameraStream')

// .get carries the resource identity in the R channel,
// so TypeScript verifies the resource is registered at compile time
const takePhoto = (): Command<
  typeof TookPhoto | typeof CameraUnavailable,
  never,
  ManagedResource.ServiceOf<typeof CameraStream>
> =>
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

    return TookPhoto({ width: bitmap.width, height: bitmap.height })
  }).pipe(
    Effect.catchTag('ResourceNotAvailable', () => Effect.succeed(CameraUnavailable())),
  )
