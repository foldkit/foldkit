import { Effect, Option, Schema as S, pipe } from 'effect'
import { ManagedResource, Runtime } from 'foldkit'

// 1. Define a Managed Resource identity
const CameraStream = ManagedResource.tag<MediaStream>()('CameraStream')

// 2. Wire the lifecycle with make. The requirements schema sits inline next
//    to its config: Option.some = active, Option.none = inactive
const managedResources = ManagedResource.make<Model, Message>()(entry => ({
  camera: entry(S.Option(S.Struct({ facingMode: S.String })), {
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
    acquire: ({ facingMode }) =>
      Effect.tryPromise(() =>
        navigator.mediaDevices.getUserMedia({
          video: { facingMode },
        }),
      ),
    release: stream =>
      Effect.sync(() => stream.getTracks().forEach(track => track.stop())),
    onAcquired: () => AcquiredCamera(),
    onReleased: () => ReleasedCamera(),
    onAcquireError: error => FailedAcquireCamera({ error: String(error) }),
  }),
}))

// 3. Pass to makeProgram
const program = Runtime.makeProgram({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  managedResources,
})
