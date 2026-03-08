import { Effect, Option, Schema as S, pipe } from 'effect'
import { ManagedResource, Runtime } from 'foldkit'

// 1. Define a managed resource identity
const CameraStream = ManagedResource.tag<MediaStream>()('CameraStream')

// 2. Define a requirements schema — Option.some = active, Option.none = inactive
const ManagedResourceDeps = S.Struct({
  camera: S.Option(S.Struct({ facingMode: S.String })),
})

// 3. Wire lifecycle with makeManagedResources
const managedResources = ManagedResource.makeManagedResources(
  ManagedResourceDeps,
)<Model, Message>({
  camera: {
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
    onAcquireError: error => FailedToAcquireCamera({ error: String(error) }),
  },
})

// 4. Pass to makeElement or makeApplication
const element = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
  managedResources,
})
