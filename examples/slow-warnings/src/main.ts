import {
  Array,
  Effect,
  Match as M,
  Option,
  Queue,
  Schema as S,
  Stream,
  pipe,
} from 'effect'
import { Command, Runtime, Subscription } from 'foldkit'
import { type Document, type Html, createLazy, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { ts } from 'foldkit/schema'

const UPDATE_WORK_MS = 10
const VIEW_WORK_MS = 24
const SUBSCRIPTIONS_WORK_MS = 8
const PATCH_ROW_COUNT = 4000
const MAX_WARNING_COUNT = 8
const SLOW_WARNING_EVENT = 'foldkit:slow-warning'

const h = html<Message>()

const IdleWorkload = ts('Idle')
const UpdateWorkload = ts('Update')
const ViewWorkload = ts('View')
const PatchWorkload = ts('Patch')
const SubscriptionsWorkload = ts('Subscriptions')

const Workload = S.Union([
  IdleWorkload,
  UpdateWorkload,
  ViewWorkload,
  PatchWorkload,
  SubscriptionsWorkload,
])
type Workload = typeof Workload.Type

const SlowPhase = S.Literals(['Update', 'View', 'Patch', 'Subscriptions'])
type SlowPhase = typeof SlowPhase.Type

export const SlowWarning = S.Struct({
  id: S.Number,
  phase: SlowPhase,
  durationMs: S.Number,
  thresholdMs: S.Number,
  trigger: S.String,
  details: S.String,
})
export type SlowWarning = typeof SlowWarning.Type

// MODEL

export const Model = S.Struct({
  activeWorkload: Workload,
  warnings: S.Array(SlowWarning),
  patchRows: S.Number,
  patchRun: S.Number,
  subscriptionsRun: S.Number,
  updateChecksum: S.Number,
  viewRun: S.Number,
})
export type Model = typeof Model.Type

// MESSAGE

export const ClickedRunUpdateWork = m('ClickedRunUpdateWork')
export const ClickedRunViewWork = m('ClickedRunViewWork')
export const ClickedRunPatchWork = m('ClickedRunPatchWork')
export const ClickedRunSubscriptionsWork = m('ClickedRunSubscriptionsWork')
export const ClickedClearWarnings = m('ClickedClearWarnings')
export const RecordedSlowWarning = m('RecordedSlowWarning', {
  warning: SlowWarning,
})

export const Message = S.Union([
  ClickedRunUpdateWork,
  ClickedRunViewWork,
  ClickedRunPatchWork,
  ClickedRunSubscriptionsWork,
  ClickedClearWarnings,
  RecordedSlowWarning,
])
export type Message = typeof Message.Type

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const slowWarningTarget = new EventTarget()
let nextWarningId = 1

const burnCpu = (durationMs: number): number => {
  const stopAt = performance.now() + durationMs
  let checksum = 0

  while (performance.now() < stopAt) {
    checksum = (checksum + Math.sqrt(checksum + 1)) % 100000
  }

  return checksum
}

const nextSlowWarningId = (): number => {
  const id = nextWarningId
  nextWarningId += 1
  return id
}

const messageTrigger = (message: Message): string => message._tag

const maybeMessageTrigger = (message: Option.Option<Message>): string =>
  Option.match(message, {
    onNone: () => 'initial render',
    onSome: messageTrigger,
  })

const triggerForSlowContext = (
  context: Runtime.SlowContext<Model, Message>,
): string =>
  M.value(context).pipe(
    M.withReturnType<string>(),
    M.tagsExhaustive({
      Update: ({ message }) => messageTrigger(message),
      View: ({ message }) => maybeMessageTrigger(message),
      Patch: ({ message }) => maybeMessageTrigger(message),
      Subscriptions: ({ subscriptionKey }) => subscriptionKey,
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
      Subscriptions: () =>
        'A subscription spent time deriving its dependency struct from the Model.',
    }),
  )

const slowContextToWarning = (
  context: Runtime.SlowContext<Model, Message>,
): SlowWarning => ({
  id: nextSlowWarningId(),
  phase: context._tag,
  durationMs: context.durationMs,
  thresholdMs: context.thresholdMs,
  trigger: triggerForSlowContext(context),
  details: detailsForSlowContext(context),
})

export const publishSlowWarning = (
  context: Runtime.SlowContext<Model, Message>,
): void => {
  slowWarningTarget.dispatchEvent(
    new CustomEvent<SlowWarning>(SLOW_WARNING_EVENT, {
      detail: slowContextToWarning(context),
    }),
  )
}

const prependWarning = (
  warnings: ReadonlyArray<SlowWarning>,
  warning: SlowWarning,
): ReadonlyArray<SlowWarning> =>
  pipe([warning, ...warnings], Array.take(MAX_WARNING_COUNT))

// UPDATE

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      ClickedRunUpdateWork: () => [
        {
          ...model,
          activeWorkload: UpdateWorkload(),
          updateChecksum: burnCpu(UPDATE_WORK_MS),
        },
        [],
      ],
      ClickedRunViewWork: () => [
        {
          ...model,
          activeWorkload: ViewWorkload(),
          viewRun: model.viewRun + 1,
        },
        [],
      ],
      ClickedRunPatchWork: () => [
        {
          ...model,
          activeWorkload: PatchWorkload(),
          patchRows: PATCH_ROW_COUNT,
          patchRun: model.patchRun + 1,
        },
        [],
      ],
      ClickedRunSubscriptionsWork: () => [
        {
          ...model,
          activeWorkload: SubscriptionsWorkload(),
          subscriptionsRun: model.subscriptionsRun + 1,
        },
        [],
      ],
      ClickedClearWarnings: () => [
        {
          ...model,
          activeWorkload: IdleWorkload(),
          patchRows: 0,
          warnings: [],
        },
        [],
      ],
      RecordedSlowWarning: ({ warning }) => [
        {
          ...model,
          activeWorkload: IdleWorkload(),
          warnings: prependWarning(model.warnings, warning),
        },
        [],
      ],
    }),
  )

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => [
  {
    activeWorkload: IdleWorkload(),
    warnings: [],
    patchRows: 0,
    patchRun: 0,
    subscriptionsRun: 0,
    updateChecksum: 0,
    viewRun: 0,
  },
  [],
]

// SUBSCRIPTION

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  slowWarnings: Subscription.persistent(
    Stream.callback<typeof RecordedSlowWarning.Type>(queue =>
      Effect.acquireRelease(
        Effect.sync(() => {
          const handler = (event: Event) => {
            if (event instanceof CustomEvent) {
              pipe(
                S.decodeUnknownOption(SlowWarning)(event.detail),
                Option.match({
                  onNone: () => undefined,
                  onSome: warning =>
                    Queue.offerUnsafe(queue, RecordedSlowWarning({ warning })),
                }),
              )
            }
          }

          slowWarningTarget.addEventListener(SLOW_WARNING_EVENT, handler)
          return handler
        }),
        handler =>
          Effect.sync(() =>
            slowWarningTarget.removeEventListener(SLOW_WARNING_EVENT, handler),
          ),
      ).pipe(Effect.flatMap(() => Effect.never)),
    ),
  ),
  workloadDependencies: entry(
    {
      activeWorkload: Workload,
      subscriptionsRun: S.Number,
    },
    {
      modelToDependencies: model => {
        if (model.activeWorkload._tag === 'Subscriptions') {
          burnCpu(SUBSCRIPTIONS_WORK_MS)
        }

        return {
          activeWorkload: model.activeWorkload,
          subscriptionsRun: model.subscriptionsRun,
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
      'Subscriptions',
      () => 'border-emerald-400 bg-emerald-50 text-emerald-950',
    ),
    M.exhaustive,
  )

const workloadLabel = (workload: Workload): string =>
  M.value(workload).pipe(
    M.withReturnType<string>(),
    M.tagsExhaustive({
      Idle: () => 'Idle',
      Update: () => 'Update workload',
      View: () => 'View workload',
      Patch: () => 'Patch workload',
      Subscriptions: () => 'Subscriptions workload',
    }),
  )

const maybeRunViewWork = (workload: Workload): Option.Option<number> => {
  if (workload._tag === 'View') {
    return Option.some(burnCpu(VIEW_WORK_MS))
  } else {
    return Option.none()
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
}>): Html =>
  h.article(
    [h.Class(`rounded-lg border p-4 shadow-sm ${phaseAccentClass(phase)}`)],
    [
      h.div(
        [h.Class('mb-4 flex items-start justify-between gap-3')],
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
          h.span(
            [
              h.Class(
                'rounded-md bg-white/75 px-2 py-1 text-xs font-semibold uppercase tracking-wide',
              ),
            ],
            [phase],
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

const statusView = (
  model: Model,
  maybeViewChecksum: Option.Option<number>,
): Html =>
  h.keyed('section')(
    model.activeWorkload._tag,
    [h.Class('rounded-lg border border-zinc-200 bg-white p-4 shadow-sm')],
    [
      h.div(
        [h.Class('flex flex-wrap items-center justify-between gap-3')],
        [
          h.div(
            [],
            [
              h.h2(
                [h.Class('text-sm font-semibold text-zinc-500')],
                ['Current workload'],
              ),
              h.p(
                [h.Class('text-2xl font-bold text-zinc-950')],
                [workloadLabel(model.activeWorkload)],
              ),
            ],
          ),
          h.div(
            [h.Class('text-sm text-zinc-600')],
            [
              `Update checksum ${model.updateChecksum.toFixed(2)} · view run ${model.viewRun} · subscription run ${model.subscriptionsRun}`,
            ],
          ),
        ],
      ),
      Option.match(maybeViewChecksum, {
        onNone: () => h.div([], []),
        onSome: checksum =>
          h.p(
            [h.Class('mt-3 text-sm text-sky-700')],
            [`View checksum ${checksum.toFixed(2)}`],
          ),
      }),
    ],
  )

const warningView = (warning: SlowWarning): Html =>
  h.keyed('li')(
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
            [`${warning.phase} exceeded ${warning.thresholdMs}ms`],
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

const warningsView = (warnings: ReadonlyArray<SlowWarning>): Html =>
  h.section(
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

const patchRowsView = (rowCount: number, patchRun: number): Html => {
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

const patchSurfaceView = (model: Model): Html =>
  h.section(
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

export const view = (model: Model): Document => {
  const maybeViewChecksum = maybeRunViewWork(model.activeWorkload)

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
                h.p(
                  [
                    h.Class(
                      'mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500',
                    ),
                  ],
                  ['Foldkit example'],
                ),
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
            statusView(model, maybeViewChecksum),
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
                  phase: 'Subscriptions',
                  thresholdMs: 2,
                  title: 'Slow subscriptions',
                  body: 'Burns CPU while deriving subscription dependencies.',
                  buttonText: 'Run subscriptions work',
                  message: ClickedRunSubscriptionsWork(),
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
