import { Effect, Schema } from 'effect'
import { Runtime } from 'foldkit'

import { Message, Model, init, update, view } from './main'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  lazyComposition: {
    buildId: 'RoutingLazyExample',
    keys: ['Reports'],
    requested: model => model.requested,
    accepted: model => model.accepted,
    isLifecycleMessage: Schema.is(
      Schema.Union([
        Message.ClickedReports,
        Message.ClickedHome,
        Message.CompletedLoadComposition,
        Message.FailedLoadComposition,
      ]),
    ),
    load: () =>
      Effect.tryPromise({
        try: () => import('./reports'),
        catch: cause =>
          cause instanceof Error ? cause.message : String(cause),
      }).pipe(Effect.map(module => module.composition)),
    onLoaded: identity => Message.CompletedLoadComposition({ identity }),
    onFailed: (identity, reason) =>
      Message.FailedLoadComposition({ identity, reason }),
  },
  devTools: { Message },
})

Runtime.run(application)
