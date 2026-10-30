import { Effect, Option, Ref, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export type CameraHandle = Readonly<{
  maybeMediaStream: Effect.Effect<Option.Option<MediaStream>>
}>

export class Camera extends Block<
  Camera,
  Readonly<{ facingMode: string }>,
  void,
  CameraHandle
>()('Camera', {
  Message: defineMessageUnion({
    AcquiredCamera: {},
    FailedAcquireCamera: { reason: Schema.String },
  }),
  OutMessage: defineMessageUnion({
    BecameReady: {},
    FailedToStart: { reason: Schema.String },
  }),
}) {}

export const CameraLive = Camera.make(
  Effect.fn(function* (_id, { facingMode }) {
    const mediaStreamRef = yield* Ref.make(Option.none<MediaStream>())

    const acquireMediaStream = Effect.acquireRelease(
      Effect.tryPromise(() =>
        navigator.mediaDevices.getUserMedia({ video: { facingMode } }),
      ),
      mediaStream =>
        Effect.sync(() =>
          mediaStream.getTracks().forEach(track => track.stop()),
        ),
    ).pipe(
      Effect.tap(mediaStream =>
        Ref.set(mediaStreamRef, Option.some(mediaStream)),
      ),
      Effect.as(Camera.Message.AcquiredCamera()),
      Effect.catch(error =>
        Effect.succeed(
          Camera.Message.FailedAcquireCamera({ reason: String(error) }),
        ),
      ),
    )

    return {
      stream: Stream.scoped(
        Stream.concat(Stream.fromEffect(acquireMediaStream), Stream.never),
      ),

      update: {
        AcquiredCamera: model => ({
          model,
          outMessage: Camera.OutMessage.BecameReady(),
        }),
        FailedAcquireCamera: (model, { reason }) => ({
          model,
          outMessage: Camera.OutMessage.FailedToStart({ reason }),
        }),
      },

      expose: { maybeMediaStream: Ref.get(mediaStreamRef) },
    }
  }),
)
