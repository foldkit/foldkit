import { Array, Match, Option, Predicate, Record, Schema, pipe } from 'effect'

import type { Visibility } from './visibility.js'

/** Context provided when view construction exceeds its configured time budget. */
export type SlowViewContext<Model, Message> = Readonly<{
  _tag: 'View'
  model: Model
  message: Option.Option<Message>
  durationMs: number
  thresholdMs: number
}>

/** Context provided when update exceeds its configured time budget. */
export type SlowUpdateContext<Model, Message> = Readonly<{
  _tag: 'Update'
  previousModel: Model
  nextModel: Model
  message: Message
  durationMs: number
  thresholdMs: number
}>

/** Context provided when DOM patching exceeds its configured time budget. */
export type SlowPatchContext<Model, Message> = Readonly<{
  _tag: 'Patch'
  model: Model
  message: Option.Option<Message>
  durationMs: number
  thresholdMs: number
}>

/** Context provided when subscription dependency extraction exceeds its configured time budget. */
export type SlowSubscriptionDependenciesContext<Model> = Readonly<{
  _tag: 'SubscriptionDependencies'
  subscriptionKey: string
  model: Model
  durationMs: number
  thresholdMs: number
}>

/** Tagged union of every slow-phase context passed to `slow.onSlow`. */
export type SlowContext<Model, Message> =
  | SlowViewContext<Model, Message>
  | SlowUpdateContext<Model, Message>
  | SlowPatchContext<Model, Message>
  | SlowSubscriptionDependenciesContext<Model>

/** Phase names measured by the slow warning runtime option. */
export const SlowPhase = Schema.Literals([
  'Update',
  'View',
  'Patch',
  'SubscriptionDependencies',
])
export type SlowPhase = typeof SlowPhase.Type

/** Budget overrides for slow warning phases. Omitted fields use Foldkit defaults. */
export type SlowThresholdOverrides = Readonly<{
  Update?: number
  View?: number
  Patch?: number
  SubscriptionDependencies?: number
}>

/** One measured phase: its budget and the callback fired when it is exceeded. */
export type ResolvedSlowPhaseConfig<Context> = Readonly<{
  thresholdMs: number
  onSlow: (context: Context) => void
}>

type ResolvedSlowConfig<Model, Message> = Readonly<{
  view: Option.Option<ResolvedSlowPhaseConfig<SlowViewContext<Model, Message>>>
  update: Option.Option<
    ResolvedSlowPhaseConfig<SlowUpdateContext<Model, Message>>
  >
  patch: Option.Option<
    ResolvedSlowPhaseConfig<SlowPatchContext<Model, Message>>
  >
  subscriptionDependencies: Option.Option<
    ResolvedSlowPhaseConfig<SlowSubscriptionDependenciesContext<Model>>
  >
}>

/**
 * Slow-phase warning configuration.
 *
 * By default, all phases are enabled in development with Foldkit's default
 * thresholds. Pass `false` to disable warnings entirely. Pass an object to
 * refine those defaults.
 *
 * - `show`: `'Development'` (default) enables warnings only when Vite HMR is active. `'Always'` enables them in every environment.
 * - `measuredPhases`: Phases to measure. Defaults to every slow warning phase.
 * - `thresholdOverrides`: Per-phase budget overrides. Omitted fields keep defaults; overrides for unmeasured phases are ignored.
 * - `onSlow`: Callback for every measured phase that exceeds its budget. Replaces Foldkit's default `console.warn`; Foldkit will not also warn for tags your callback ignores.
 */
export type SlowConfig<Model, Message> =
  | false
  | Readonly<{
      show?: Visibility
      measuredPhases?: ReadonlyArray<SlowPhase>
      thresholdOverrides?: SlowThresholdOverrides
      onSlow?: (context: SlowContext<Model, Message>) => void
    }>

const DEFAULT_SLOW_SHOW: Visibility = 'Development'
const DEFAULT_SLOW_VIEW_THRESHOLD_MS = 16
const DEFAULT_SLOW_UPDATE_THRESHOLD_MS = 4
const DEFAULT_SLOW_PATCH_THRESHOLD_MS = 8
const DEFAULT_SLOW_SUBSCRIPTION_DEPENDENCIES_THRESHOLD_MS = 2

const ALL_SLOW_PHASES: ReadonlyArray<SlowPhase> = [
  'Update',
  'View',
  'Patch',
  'SubscriptionDependencies',
]

const resolveSlowPhase = <Context>(
  isMeasured: boolean,
  thresholdMs: number,
  onSlow: (context: Context) => void,
): Option.Option<ResolvedSlowPhaseConfig<Context>> =>
  Option.liftPredicate(
    {
      thresholdMs,
      onSlow,
    },
    () => isMeasured,
  )

export const __resolveSlowConfig = <Model, Message>(
  slow: SlowConfig<Model, Message> | undefined,
  isSlowVisible: (show: Visibility) => boolean,
): Option.Option<ResolvedSlowConfig<Model, Message>> => {
  const maybeSlowConfig = Match.value(slow).pipe(
    Match.withReturnType<
      Option.Option<Exclude<SlowConfig<Model, Message>, false>>
    >(),
    Match.when(false, () => Option.none()),
    Match.when(Predicate.isUndefined, () =>
      Option.some<Exclude<SlowConfig<Model, Message>, false>>({}),
    ),
    Match.orElse(config => Option.some(config)),
  )

  return pipe(
    maybeSlowConfig,
    Option.filter(config => isSlowVisible(config.show ?? DEFAULT_SLOW_SHOW)),
    Option.map(config => {
      const onSlow = config.onSlow ?? defaultSlowCallback
      const measuredPhases = config.measuredPhases ?? ALL_SLOW_PHASES
      const isPhaseMeasured = (phase: SlowPhase): boolean =>
        Array.contains(measuredPhases, phase)

      return {
        view: resolveSlowPhase(
          isPhaseMeasured('View'),
          config.thresholdOverrides?.View ?? DEFAULT_SLOW_VIEW_THRESHOLD_MS,
          onSlow,
        ),
        update: resolveSlowPhase(
          isPhaseMeasured('Update'),
          config.thresholdOverrides?.Update ?? DEFAULT_SLOW_UPDATE_THRESHOLD_MS,
          onSlow,
        ),
        patch: resolveSlowPhase(
          isPhaseMeasured('Patch'),
          config.thresholdOverrides?.Patch ?? DEFAULT_SLOW_PATCH_THRESHOLD_MS,
          onSlow,
        ),
        subscriptionDependencies: resolveSlowPhase(
          isPhaseMeasured('SubscriptionDependencies'),
          config.thresholdOverrides?.SubscriptionDependencies ??
            DEFAULT_SLOW_SUBSCRIPTION_DEPENDENCIES_THRESHOLD_MS,
          onSlow,
        ),
      }
    }),
  )
}

export const measureSlowPhase = <Context, Result>(
  maybeConfig: Option.Option<ResolvedSlowPhaseConfig<Context>>,
  run: () => Result,
): readonly [Result, Option.Option<number>] => {
  if (Option.isSome(maybeConfig)) {
    const start = performance.now()
    const result = run()

    return [result, Option.some(performance.now() - start)]
  } else {
    return [run(), Option.none()]
  }
}

export const reportSlowPhase = <Context>(
  maybeConfig: Option.Option<ResolvedSlowPhaseConfig<Context>>,
  maybeDurationMs: Option.Option<number>,
  makeContext: (durationMs: number, thresholdMs: number) => Context,
): void => {
  if (Option.isSome(maybeConfig)) {
    const { thresholdMs, onSlow } = maybeConfig.value
    const maybeExceededDuration = Option.filter(
      maybeDurationMs,
      durationMs => durationMs > thresholdMs,
    )

    if (Option.isSome(maybeExceededDuration)) {
      onSlow(makeContext(maybeExceededDuration.value, thresholdMs))
    }
  }
}

const messageTag = (rawMessage: unknown): string =>
  pipe(
    rawMessage,
    Option.liftPredicate(Predicate.isObject),
    Option.flatMap(Record.get('_tag')),
    Option.match({
      onNone: () => 'unknown',
      onSome: String,
    }),
  )

const optionMessageTrigger = (maybeMessage: Option.Option<unknown>): string =>
  Option.match(maybeMessage, {
    onNone: () => 'init',
    onSome: messageTag,
  })

const TUNING_HINT =
  'Set slow.thresholdOverrides to change budgets or pass slow: false to disable warnings.'

export const defaultSlowCallback = (
  context: SlowContext<unknown, unknown>,
): void => {
  const { durationMs, thresholdMs: budget } = context
  const duration = durationMs.toFixed(1)

  const summary = Match.value(context).pipe(
    Match.tagsExhaustive({
      View: ({ message }) =>
        `Slow view: ${duration}ms (budget: ${budget}ms), triggered by ${optionMessageTrigger(message)}. Keep render-only work in the view path and memoize expensive subtrees with createLazy or createKeyedLazy.`,
      Update: ({ message }) =>
        `Slow update: ${duration}ms (budget: ${budget}ms), triggered by ${messageTag(message)}. Inspect the triggering Message branch; move render-only derivations to memoized views and keep update focused on state transitions.`,
      Patch: ({ message }) =>
        `Slow patch: ${duration}ms (budget: ${budget}ms), triggered by ${optionMessageTrigger(message)}. Key mapped lists by stable ids, split large views, or memoize stable subtrees with createLazy.`,
      SubscriptionDependencies: ({ subscriptionKey }) =>
        `Slow subscription dependencies: ${duration}ms (budget: ${budget}ms) for subscription "${subscriptionKey}". Keep modelToDependencies a cheap projection from modeled fields; avoid scans, sorting, serialization, and large dependency objects.`,
    }),
  )

  const maybeRawMessage: Option.Option<unknown> = Match.value(context).pipe(
    Match.withReturnType<Option.Option<unknown>>(),
    Match.tagsExhaustive({
      Update: ({ message }) => Option.some<unknown>(message),
      View: ({ message }) => message,
      Patch: ({ message }) => message,
      SubscriptionDependencies: () => Option.none(),
    }),
  )

  console.warn(
    `[foldkit] ${summary} ${TUNING_HINT}`,
    context,
    ...Option.toArray(maybeRawMessage),
  )
}
