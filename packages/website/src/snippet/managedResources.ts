import { Effect, Option, Schema, pipe } from 'effect'
import { Application, ManagedResource, Runtime } from 'foldkit'

// 1. Define a Managed Resource identity
const CameraStream = ManagedResource.tag<MediaStream>()('CameraStream')

// 2. Wire the lifecycle with make. Option.some = active; Option.none = inactive.
const managedResources = ManagedResource.make<Model, Message>()(entry => ({
  camera: entry(
    'ManageCamera',
    Schema.Option(Schema.Struct({ facingMode: Schema.String })),
    {
      resource: CameraStream,
      modelToMaybeRequirements: model =>
        pipe(
          model.callState,
          Option.liftPredicate(
            (callState): callState is typeof InCall.Type =>
              callState._tag === 'InCall',
          ),
          Option.map(callState => ({
            facingMode: callState.facingMode,
          })),
        ),
      onAcquired: () => AcquiredCamera(),
      onReleased: () => ReleasedCamera(),
      onAcquireError: error => FailedAcquireCamera({ error: String(error) }),
    },
  ),
}))

// 3. Supply the lifecycle implementation with a Layer.
const ManageCameraLive = managedResources.camera.toLayer({
  acquire: ({ facingMode }) =>
    Effect.tryPromise(() =>
      navigator.mediaDevices.getUserMedia({ video: { facingMode } }),
    ),
  release: stream =>
    Effect.sync(() => stream.getTracks().forEach(track => track.stop())),
})

const application = Application.make({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  managedResources,
})

Runtime.run(Application.provide(application, ManageCameraLive))
