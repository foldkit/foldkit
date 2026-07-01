import {
  Array,
  Match as M,
  Number,
  Option,
  Schema as S,
  Stream,
  pipe,
} from 'effect'
import { Command, Runtime, Subscription } from 'foldkit'
import { type Document, type Html, createLazy, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

const UPDATE_WORK_MS = 10
const VIEW_WORK_MS = 24
const SUBSCRIPTION_DEPENDENCIES_WORK_MS = 8
const PATCH_ROW_COUNT = 4000
const MAX_WARNING_COUNT = 8
const SLOW_WARNING_EVENT = 'foldkit:slow-warning'

const Workload = S.Literals([
  'Idle',
  'Update',
  'View',
  'Patch',
  'SubscriptionDependencies',
])
type Workload = typeof Workload.Type

type SlowPhase = Runtime.SlowPhase

export const SlowWarningReport = S.Struct({
  phase: Runtime.SlowPhase,
  durationMs: S.Number,
  thresholdMs: S.Number,
  trigger: S.String,
  details: S.String,
})
export type SlowWarningReport = typeof SlowWarningReport.Type

export const SlowWarning = S.Struct({
  id: S.Number,
  ...SlowWarningReport.fields,
})
export type SlowWarning = typeof SlowWarning.Type

// MODEL

export const Model = S.Struct({
  activeWorkload: Workload,
  nextWarningId: S.Number,
  warnings: S.Array(SlowWarning),
  patchRows: S.Number,
  patchRun: S.Number,
})
export type Model = typeof Model.Type

// MESSAGE

export const ClickedRunUpdateWork = m('ClickedRunUpdateWork')
export const ClickedRunViewWork = m('ClickedRunViewWork')
export const ClickedRunPatchWork = m('ClickedRunPatchWork')
export const ClickedRunSubscriptionDependenciesWork = m(
  'ClickedRunSubscriptionDependenciesWork',
)
export const ClickedClearWarnings = m('ClickedClearWarnings')
export const RecordedSlowWarning = m('RecordedSlowWarning', {
  report: SlowWarningReport,
})

export const Message = S.Union([
  ClickedRunUpdateWork,
  ClickedRunViewWork,
  ClickedRunPatchWork,
  ClickedRunSubscriptionDependenciesWork,
  ClickedClearWarnings,
  RecordedSlowWarning,
])
export type Message = typeof Message.Type

const slowWarningTarget = new EventTarget()

const burnCpu = (durationMs: number): number => {
  const stopAt = performance.now() + durationMs
  let checksum = 0

  while (performance.now() < stopAt) {
    checksum = (checksum + Math.sqrt(checksum + 1)) % 100000
  }

  return checksum
}

const messageToTag = ({ _tag }: Message): string => _tag

const maybeMessageTrigger = (message: Option.Option<Message>): string =>
  Option.match(message, {
    onNone: () => 'initial render',
    onSome: messageToTag,
  })

const triggerForSlowContext = (
  context: Runtime.SlowContext<Model, Message>,
): string =>
  M.value(context).pipe(
    M.withReturnType<string>(),
    M.tagsExhaustive({
      Update: ({ message }) => messageToTag(message),
      View: ({ message }) => maybeMessageTrigger(message),
      Patch: ({ message }) => maybeMessageTrigger(message),
      SubscriptionDependencies: ({ subscriptionKey }) => subscriptionKey,
    }),
  )

const detailsForSlowContext = (
  context: Runtime.SlowContext<Model, Message>,
): string =>
  M.value(context).pipe(
    M.withReturnType<string>(),
    M.tagsExhaustive({
      Update: () =>
        'CPU work ran inside update before Foldkit could return the next Model.',
      View: () =>
        'The view function performed expensive synchronous work while building the next VNode tree.',
      Patch: () =>
        'The patch phase inserted thousands of keyed rows into the live DOM.',
      SubscriptionDependencies: () =>
        'A subscription spent time deriving its dependency struct from the Model.',
    }),
  )

const phaseLabel = (phase: SlowPhase): string =>
  M.value(phase).pipe(
    M.withReturnType<string>(),
    M.when('Update', () => 'Update'),
    M.when('View', () => 'View'),
    M.when('Patch', () => 'Patch'),
    M.when('SubscriptionDependencies', () => 'Subscription dependencies'),
    M.exhaustive,
  )

const slowContextToReport = (
  context: Runtime.SlowContext<Model, Message>,
): SlowWarningReport => ({
  phase: context._tag,
  durationMs: context.durationMs,
  thresholdMs: context.thresholdMs,
  trigger: triggerForSlowContext(context),
  details: detailsForSlowContext(context),
})

export const handleSlow = (
  context: Runtime.SlowContext<Model, Message>,
): void => {
  Runtime.defaultSlowCallback(context)

  const report = slowContextToReport(context)
  slowWarningTarget.dispatchEvent(
    new CustomEvent<SlowWarningReport>(SLOW_WARNING_EVENT, {
      detail: report,
    }),
  )
}

// UPDATE

const prependWarning =
  (warning: SlowWarning) =>
  (warnings: ReadonlyArray<SlowWarning>): ReadonlyArray<SlowWarning> =>
    pipe(warnings, Array.prepend(warning), Array.take(MAX_WARNING_COUNT))

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      ClickedRunUpdateWork: () => {
        burnCpu(UPDATE_WORK_MS)

        return [
          evo(model, {
            activeWorkload: () => 'Update',
          }),
          [],
        ]
      },
      ClickedRunViewWork: () => [
        evo(model, {
          activeWorkload: () => 'View',
        }),
        [],
      ],
      ClickedRunPatchWork: () => [
        evo(model, {
          activeWorkload: () => 'Patch',
          patchRows: () => PATCH_ROW_COUNT,
          patchRun: Number.increment,
        }),
        [],
      ],
      ClickedRunSubscriptionDependenciesWork: () => [
        evo(model, {
          activeWorkload: () => 'SubscriptionDependencies',
        }),
        [],
      ],
      ClickedClearWarnings: () => [
        evo(model, {
          activeWorkload: () => 'Idle',
          warnings: () => [],
        }),
        [],
      ],
      RecordedSlowWarning: ({ report }) => {
        const warning: SlowWarning = {
          id: model.nextWarningId,
          ...report,
        }

        return [
          evo(model, {
            activeWorkload: () => 'Idle',
            nextWarningId: Number.increment,
            warnings: prependWarning(warning),
          }),
          [],
        ]
      },
    }),
  )

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => [
  {
    activeWorkload: 'Idle',
    nextWarningId: 1,
    warnings: [],
    patchRows: 0,
    patchRun: 0,
  },
  [],
]

// SUBSCRIPTION

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  slowWarnings: Subscription.persistent(
    Subscription.fromEventFilterMap<
      CustomEvent,
      typeof RecordedSlowWarning.Type
    >({
      target: slowWarningTarget,
      type: SLOW_WARNING_EVENT,
      toMessage: event =>
        pipe(
          event.detail,
          S.decodeUnknownOption(SlowWarningReport),
          Option.map(report => RecordedSlowWarning({ report })),
        ),
    }),
  ),
  burnCpuDuringDependencyExtraction: entry(
    {
      activeWorkload: Workload,
    },
    {
      modelToDependencies: model => {
        if (model.activeWorkload === 'SubscriptionDependencies') {
          burnCpu(SUBSCRIPTION_DEPENDENCIES_WORK_MS)
        }

        return {
          activeWorkload: model.activeWorkload,
        }
      },
      dependenciesToStream: () => Stream.empty,
    },
  ),
}))

// VIEW

const lazyPatchRows = createLazy()

const buttonClass =
  'inline-flex items-center justify-center rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950'

const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950'

const phaseAccentClass = (phase: SlowPhase): string =>
  M.value(phase).pipe(
    M.withReturnType<string>(),
    M.when('Update', () => 'border-amber-400 bg-amber-50 text-amber-950'),
    M.when('View', () => 'border-sky-400 bg-sky-50 text-sky-950'),
    M.when('Patch', () => 'border-rose-400 bg-rose-50 text-rose-950'),
    M.when(
      'SubscriptionDependencies',
      () => 'border-emerald-400 bg-emerald-50 text-emerald-950',
    ),
    M.exhaustive,
  )

const burnCpuDuringView = (workload: Workload): void => {
  if (workload === 'View') {
    burnCpu(VIEW_WORK_MS)
  }
}

const scenarioCard = ({
  phase,
  thresholdMs,
  title,
  body,
  buttonText,
  message,
}: Readonly<{
  phase: SlowPhase
  thresholdMs: number
  title: string
  body: string
  buttonText: string
  message: Message
}>): Html => {
  const h = html<Message>()

  return h.article(
    [h.Class(`rounded-lg border p-4 shadow-sm ${phaseAccentClass(phase)}`)],
    [
      h.div(
        [h.Class('mb-4')],
        [
          h.div(
            [],
            [
              h.h2([h.Class('text-base font-bold')], [title]),
              h.p(
                [h.Class('mt-1 text-sm opacity-80')],
                [`Default threshold: ${thresholdMs}ms`],
              ),
            ],
          ),
        ],
      ),
      h.p([h.Class('mb-4 text-sm leading-6')], [body]),
      h.button(
        [h.Type('button'), h.Class(buttonClass), h.OnClick(message)],
        [buttonText],
      ),
    ],
  )
}

const warningView = (warning: SlowWarning): Html => {
  const h = html<Message>()

  return h.keyed('li')(
    warning.id.toString(),
    [
      h.Class(
        `rounded-lg border p-4 shadow-sm ${phaseAccentClass(warning.phase)}`,
      ),
    ],
    [
      h.div(
        [h.Class('flex flex-wrap items-baseline justify-between gap-2')],
        [
          h.h3(
            [h.Class('text-base font-bold')],
            [`${phaseLabel(warning.phase)} exceeded ${warning.thresholdMs}ms`],
          ),
          h.p(
            [h.Class('text-sm font-semibold')],
            [`${warning.durationMs.toFixed(1)}ms`],
          ),
        ],
      ),
      h.p(
        [h.Class('mt-2 text-sm leading-6')],
        [`${warning.details} Trigger: ${warning.trigger}.`],
      ),
    ],
  )
}

const warningsView = (warnings: ReadonlyArray<SlowWarning>): Html => {
  const h = html<Message>()

  return h.section(
    [h.Class('rounded-lg border border-zinc-200 bg-white p-4 shadow-sm')],
    [
      h.div(
        [h.Class('mb-4 flex flex-wrap items-center justify-between gap-3')],
        [
          h.div(
            [],
            [
              h.h2(
                [h.Class('text-lg font-bold text-zinc-950')],
                ['Recorded warnings'],
              ),
              h.p(
                [h.Class('text-sm text-zinc-600')],
                ['Warnings here come from the real Runtime slow callback.'],
              ),
            ],
          ),
          h.button(
            [
              h.Type('button'),
              h.Class(secondaryButtonClass),
              h.OnClick(ClickedClearWarnings()),
            ],
            ['Clear'],
          ),
        ],
      ),
      h.keyed('div')(
        Array.isReadonlyArrayEmpty(warnings) ? 'empty' : 'warnings',
        [],
        Array.isReadonlyArrayEmpty(warnings)
          ? [
              h.div(
                [
                  h.Class(
                    'rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-600',
                  ),
                ],
                ['Run a workload to record a warning.'],
              ),
            ]
          : [h.ul([h.Class('grid gap-3')], Array.map(warnings, warningView))],
      ),
    ],
  )
}

const patchRowsView = (rowCount: number, patchRun: number): Html => {
  const h = html<Message>()

  if (rowCount === 0) {
    return h.keyed('div')(
      'empty',
      [
        h.Class(
          'rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-600',
        ),
      ],
      ['Patch rows will appear here.'],
    )
  } else {
    return h.keyed('div')(
      `rows-${patchRun}`,
      [h.Class('grid max-h-80 gap-1 overflow-auto pr-2')],
      Array.map(Array.range(1, rowCount), row =>
        h.keyed('div')(
          `patch-row-${patchRun}-${row}`,
          [
            h.Class(
              'flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600',
            ),
          ],
          [
            h.span([], [`Patch row ${row}`]),
            h.span([h.Class('font-mono')], [`run ${patchRun}`]),
          ],
        ),
      ),
    )
  }
}

const patchSurfaceView = (model: Model): Html => {
  const h = html<Message>()

  return h.section(
    [h.Class('rounded-lg border border-zinc-200 bg-white p-4 shadow-sm')],
    [
      h.div(
        [h.Class('mb-4 flex flex-wrap items-center justify-between gap-3')],
        [
          h.div(
            [],
            [
              h.h2(
                [h.Class('text-lg font-bold text-zinc-950')],
                ['Patch surface'],
              ),
              h.p(
                [h.Class('text-sm text-zinc-600')],
                [`${model.patchRows.toLocaleString()} keyed rows mounted`],
              ),
            ],
          ),
        ],
      ),
      lazyPatchRows(patchRowsView, [model.patchRows, model.patchRun]),
    ],
  )
}

export const view = (model: Model): Document => {
  const h = html<Message>()

  burnCpuDuringView(model.activeWorkload)

  return {
    title: 'Slow Warnings Lab',
    body: h.main(
      [h.Class('min-h-screen bg-zinc-50 text-zinc-950')],
      [
        h.header(
          [h.Class('border-b border-zinc-200 bg-white')],
          [
            h.div(
              [h.Class('mx-auto max-w-6xl px-5 py-6')],
              [
                h.h1(
                  [h.Class('text-3xl font-bold tracking-normal text-zinc-950')],
                  ['Slow Warnings Lab'],
                ),
                h.p(
                  [h.Class('mt-2 max-w-3xl text-zinc-600')],
                  [
                    'Each workload intentionally blocks one part of the synchronous update cycle long enough to trip the default threshold.',
                  ],
                ),
              ],
            ),
          ],
        ),
        h.div(
          [h.Class('mx-auto grid max-w-6xl gap-6 px-5 py-6')],
          [
            h.section(
              [h.Class('grid gap-4 md:grid-cols-2')],
              [
                scenarioCard({
                  phase: 'Update',
                  thresholdMs: 4,
                  title: 'Slow update',
                  body: 'Runs CPU work before returning the next Model.',
                  buttonText: 'Run update work',
                  message: ClickedRunUpdateWork(),
                }),
                scenarioCard({
                  phase: 'View',
                  thresholdMs: 16,
                  title: 'Slow view',
                  body: 'Runs CPU work while the view builds the VNode tree.',
                  buttonText: 'Run view work',
                  message: ClickedRunViewWork(),
                }),
                scenarioCard({
                  phase: 'Patch',
                  thresholdMs: 8,
                  title: 'Slow patch',
                  body: 'Mounts thousands of keyed rows into the DOM.',
                  buttonText: 'Run patch work',
                  message: ClickedRunPatchWork(),
                }),
                scenarioCard({
                  phase: 'SubscriptionDependencies',
                  thresholdMs: 2,
                  title: 'Slow subscription dependencies',
                  body: 'Burns CPU while deriving subscription dependencies.',
                  buttonText: 'Run dependency extraction',
                  message: ClickedRunSubscriptionDependenciesWork(),
                }),
              ],
            ),
            warningsView(model.warnings),
            patchSurfaceView(model),
          ],
        ),
      ],
    ),
  }
}
