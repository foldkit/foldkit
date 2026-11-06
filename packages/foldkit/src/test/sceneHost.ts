import { Array, Context, Effect, Option, Predicate, Scope } from 'effect'

import type { BindableBlock } from '../block/binding.js'
import { bindingResolverOf } from '../block/bindingConnection.js'
import { canonicalBindingOf, runtimeBindingsOf } from '../block/composition.js'
import { executionBindingsOf } from '../experimental/constructed/symbolic.js'
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
> &
  Readonly<{ resolveBinding: (declaration: object) => object }>

/** @internal Reuses the test's acquisition scope without building handler Layers. */
export const makeSceneHost = (
  block: BindableBlock,
  context: Context.Context<Scope.Scope>,
): SceneHost => {
  let runtime:
    | Pick<CompositionRuntime<any>, 'context' | 'synchronize'>
    | undefined
  let observedModel: unknown

  return {
    get context() {
      return runtime?.context ?? context
    },
    resolveBinding: declaration => {
      const resolveBinding = bindingResolverOf(declaration)
      const binding = canonicalBindingOf(
        resolveBinding === undefined
          ? declaration
          : resolveBinding(executionBindingsOf(block)),
      )

      if (
        !Predicate.isObject(binding) ||
        !Array.some(runtimeBindingsOf(block), candidate =>
          Object.is(candidate, binding),
        )
      ) {
        throw new Error(
          '[foldkit] Scene selected a child Binding that is not registered in the acquired Block graph.',
        )
      }

      return binding
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
