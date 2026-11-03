import type {
  AuthoringSource,
  CompositionOfPlan,
} from '../../../packages/foldkit/src/experimental/hybrid/authoring.js'

export type {
  ChannelRow,
  ChannelsOf,
  CompositionMetadata,
  ComposedUpdate,
  ComposableUpdates,
  RowsOf,
  UpdateStage,
} from '../../../packages/foldkit/src/experimental/hybrid/updateComposition.js'

type AnyFunction = (...args: ReadonlyArray<any>) => any

export type CompositionSource<Composition> =
  Composition extends Readonly<{ makeInit: infer MakeInit extends AnyFunction }>
    ? Extract<CompositionOfPlan<ReturnType<MakeInit>>, AuthoringSource>
    : never

export type CompositionContext<Composition> =
  Composition extends Readonly<{
    makeUpdate: Readonly<{ withContext: infer WithContext extends AnyFunction }>
  }>
    ? Readonly<Parameters<Extract<Parameters<WithContext>[0], AnyFunction>>>
    : readonly []

export type ComposableUpdatesFor<Composition> =
  Composition extends Readonly<{ makeUpdate: infer MakeUpdate }>
    ? MakeUpdate
    : never

export declare const makeComposableUpdates: <const Composition>(
  composition: Composition,
) => ComposableUpdatesFor<Composition>
