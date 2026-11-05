import { Context, Effect, Option, Scope } from 'effect'

import type { BindableBlock } from '../block/binding.js'
import {
  type CompositionRuntime,
  makeCompositionRuntime,
} from '../runtime/compositionRuntime.js'

/** @internal Supplies occurrence tracking only to Block-aware Scenes. */
export const SceneHostTypeId = Symbol('foldkit/SceneHost')

/** @internal Scene can reconcile occurrences but cannot start their handlers. */
export type SceneHost = Pick<
  CompositionRuntime<unknown>,
  'context' | 'synchronize'
>

/** @internal Reuses the test's acquisition scope without building handler Layers. */
export const makeSceneHost = (
  block: BindableBlock,
  context: Context.Context<Scope.Scope>,
): SceneHost => {
  let runtime: SceneHost | undefined
  let observedModel: unknown

  return {
    get context() {
      return runtime?.context ?? context
    },
    synchronize: model => {
      if (runtime === undefined) {
        runtime = Effect.runSyncWith(context)(
          makeCompositionRuntime({
            block,
            initModel: model,
            context,
            runtimeScope: Context.get(context, Scope.Scope),
            enqueueMessage: () => {
              throw new Error(
                '[foldkit] An unstarted Scene runtime cannot enqueue Messages.',
              )
            },
            crashWith: cause => Effect.die(cause),
            maybeSlowSubscriptionDependencies: Option.none(),
          }),
        )
      } else if (model !== observedModel) {
        runtime.synchronize(model)
      }
      observedModel = model
    },
  }
}
