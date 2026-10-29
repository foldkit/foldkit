import { Effect, Option, Schema } from 'effect'
import { Runtime } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  resources,
  managedResources,
  container: document.getElementById('root'),
  lazyComposition: {
    buildId: BUILD_ID,
    keys: ['Reports'],
    requested: model => model.requestedComposition,
    accepted: model => model.acceptedComposition,
    isLifecycleMessage: Schema.is(
      Schema.Union([
        Message.ChangedRoute,
        Message.CompletedLoadComposition,
        Message.FailedLoadComposition,
      ]),
    ),
    load: () =>
      Effect.tryPromise({
        try: () => import('./reports/composition'),
        catch: cause =>
          cause instanceof Error ? cause.message : String(cause),
      }).pipe(Effect.map(module => module.composition)),
    onLoaded: identity => Message.CompletedLoadComposition({ identity }),
    onFailed: (identity, reason) =>
      Message.FailedLoadComposition({ identity, reason }),
  },
})

const acceptLoadedComposition = (
  model: Model,
  identity: Runtime.CompositionIdentity,
) => {
  if (
    Option.isSome(model.requestedComposition) &&
    Schema.toEquivalence(Runtime.CompositionIdentity)(
      model.requestedComposition.value,
      identity,
    )
  ) {
    return {
      model: modifyFields(model, {
        acceptedComposition: () => Option.some(identity),
        requestedComposition: () => Option.none(),
      }),
    }
  }
  return { model }
}

Runtime.run(application)
