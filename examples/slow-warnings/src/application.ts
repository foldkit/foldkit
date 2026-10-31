import {
  Array,
  Effect,
  Match,
  Number,
  Option,
  Schema,
  Stream,
  pipe,
} from 'effect'
import { Block, Dom, Runtime } from 'foldkit'
import {
  type Document,
  type Html,
  type HtmlBuilder,
  createLazy,
} from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Workload = Schema.Literals(['Idle', 'Update', 'View', 'Patch'])
type Workload = typeof Workload.Type

type SlowPhase = Runtime.SlowPhase

const SlowWarningReport = Schema.Struct({
  phase: Runtime.SlowPhase,
  durationMs: Schema.Number,
  thresholdMs: Schema.Number,
  trigger: Schema.String,
  details: Schema.String,
})
type SlowWarningReport = typeof SlowWarningReport.Type

const SlowWarning = Schema.Struct({
  id: Schema.Number,
  ...SlowWarningReport.fields,
})
type SlowWarning = typeof SlowWarning.Type

export const Model = Schema.Struct({
  activeWorkload: Workload,
  nextWarningId: Schema.Number,
  warnings: Schema.Array(SlowWarning),
  patchRows: Schema.Number,
  patchRun: Schema.Number,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedRunUpdateWork: {},
  ClickedRunViewWork: {},
  ClickedRunPatchWork: {},
  ClickedClearWarnings: {},
  RecordedSlowWarning: { report: SlowWarningReport },
})
export type Message = typeof Message.Type

const UPDATE_WORK_MS = 10
const VIEW_WORK_MS = 24
const PATCH_ROW_COUNT = 4000

// NOTE: This diagnostic demo deliberately times synchronous update and view
// work.
// oxlint-disable foldkit/no-impure-call-at-decision-time
const burnCpu = (durationMs: number): number => {
  const stopAt = performance.now() + durationMs
  let checksum = 0

  while (performance.now() < stopAt) {
    checksum = (checksum + Math.sqrt(checksum + 1)) % 100000
  }

  return checksum
}
// oxlint-enable foldkit/no-impure-call-at-decision-time

const SLOW_WARNING_EVENT = 'foldkit:slow-warning'

const slowWarningTarget: Dom.TypedEventTarget<{
  [SLOW_WARNING_EVENT]: CustomEvent<SlowWarningReport>
}> = new EventTarget()

const messageToTag = (message: unknown): string => {
  const localMessage = Block.isBlockMessage(message) ? message.message : message

  if (Schema.is(Message)(localMessage)) {
    return localMessage._tag
  } else {
    return 'unrecognized Message'
  }
}

const maybeMessageTrigger = (message: Option.Option<unknown>): string =>
  Option.match(message, {
    onNone: () => 'initial render',
    onSome: messageToTag,
  })

const triggerForSlowContext = (
  context: Runtime.SlowContext<unknown, unknown>,
): string =>
  Match.value(context).pipe(
    Match.withReturnType<string>(),
    Match.tagsExhaustive({
      Update: ({ message }) => messageToTag(message),
      View: ({ message }) => maybeMessageTrigger(message),
      Patch: ({ message }) => maybeMessageTrigger(message),
      SubscriptionDependencies: ({ subscriptionKey }) => subscriptionKey,
    }),
  )

const detailsForSlowContext = (
  context: Runtime.SlowContext<unknown, unknown>,
): string =>
  Match.value(context).pipe(
    Match.withReturnType<string>(),
    Match.tagsExhaustive({
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

const slowContextToReport = (
  context: Runtime.SlowContext<unknown, unknown>,
): SlowWarningReport => ({
  phase: context._tag,
  durationMs: context.durationMs,
  thresholdMs: context.thresholdMs,
  trigger: triggerForSlowContext(context),
  details: detailsForSlowContext(context),
})

export const handleSlow = (
  context: Runtime.SlowContext<unknown, unknown>,
): void => {
  Runtime.defaultSlowCallback(context)

  const report = slowContextToReport(context)
  slowWarningTarget.dispatchEvent(
    new CustomEvent<SlowWarningReport>(SLOW_WARNING_EVENT, {
      detail: report,
    }),
  )
}

const slowWarningReports: Stream.Stream<Message> = Dom.streamFromEventFilterMap(
  {
    target: slowWarningTarget,
    type: SLOW_WARNING_EVENT,
    filterMapEvent: event =>
      pipe(
        event.detail,
        Schema.decodeOption(SlowWarningReport),
        Option.map(report => Message.RecordedSlowWarning({ report })),
      ),
  },
)

const MAX_WARNING_COUNT = 8

const prependWarning =
  (warning: SlowWarning) =>
  (warnings: ReadonlyArray<SlowWarning>): ReadonlyArray<SlowWarning> =>
    pipe(warnings, Array.prepend(warning), Array.take(MAX_WARNING_COUNT))

export class Application extends Block<Application>()('Application', {
  Model,
  Message,
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    return {
      model: {
        activeWorkload: 'Idle',
        nextWarningId: 1,
        warnings: [],
        patchRows: 0,
        patchRun: 0,
      },

      stream: slowWarningReports,

      update: {
        ClickedRunUpdateWork: model => {
          burnCpu(UPDATE_WORK_MS)
          return {
            model: modifyFields(model, { activeWorkload: () => 'Update' }),
          }
        },
        ClickedRunViewWork: model => ({
          model: modifyFields(model, { activeWorkload: () => 'View' }),
        }),
        ClickedRunPatchWork: model => ({
          model: modifyFields(model, {
            activeWorkload: () => 'Patch',
            patchRows: () => PATCH_ROW_COUNT,
            patchRun: Number.increment,
          }),
        }),
        ClickedClearWarnings: model => ({
          model: modifyFields(model, {
            activeWorkload: () => 'Idle',
            warnings: () => [],
          }),
        }),
        RecordedSlowWarning: (model, { report }) => {
          const warning: SlowWarning = {
            id: model.nextWarningId,
            ...report,
          }
          return {
            model: modifyFields(model, {
              activeWorkload: () => 'Idle',
              nextWarningId: Number.increment,
              warnings: prependWarning(warning),
            }),
          }
        },
      },

      view,
    }
  }),
)

type ApplicationViewBuilder = HtmlBuilder<Message>

const phaseLabel = (phase: SlowPhase): string =>
  Match.value(phase).pipe(
    Match.withReturnType<string>(),
    Match.when('Update', () => 'Update'),
    Match.when('View', () => 'View'),
    Match.when('Patch', () => 'Patch'),
    Match.when('SubscriptionDependencies', () => 'Subscription dependencies'),
    Match.exhaustive,
  )

const lazyPatchRows = createLazy()

const buttonClass =
  'inline-flex items-center justify-center rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950'

const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950'

const phaseAccentClass = (phase: SlowPhase): string =>
  Match.value(phase).pipe(
    Match.withReturnType<string>(),
    Match.when('Update', () => 'border-amber-400 bg-amber-50 text-amber-950'),
    Match.when('View', () => 'border-sky-400 bg-sky-50 text-sky-950'),
    Match.when('Patch', () => 'border-rose-400 bg-rose-50 text-rose-950'),
    Match.when(
      'SubscriptionDependencies',
      () => 'border-emerald-400 bg-emerald-50 text-emerald-950',
    ),
    Match.exhaustive,
  )

const burnCpuDuringView = (workload: Workload): void => {
  if (workload === 'View') {
    burnCpu(VIEW_WORK_MS)
  }
}

const scenarioCard = (
  {
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
  }>,
  h: ApplicationViewBuilder,
): Html =>
  h.article(
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

const warningView = (warning: SlowWarning, h: ApplicationViewBuilder): Html =>
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

const warningsView = (
  warnings: ReadonlyArray<SlowWarning>,
  h: ApplicationViewBuilder,
): Html =>
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
              h.OnClick(Message.ClickedClearWarnings()),
            ],
            ['Clear'],
          ),
        ],
      ),
      Array.match(warnings, {
        onEmpty: () =>
          h.div(
            [
              h.Class(
                'rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-600',
              ),
            ],
            ['Run a workload to record a warning.'],
          ),
        onNonEmpty: warnings =>
          h.ul(
            [h.Class('grid gap-3')],
            Array.map(warnings, warning => warningView(warning, h)),
          ),
      }),
    ],
  )

const patchRowsView = (
  rowCount: number,
  patchRun: number,
  h: ApplicationViewBuilder,
): Html => {
  if (rowCount === 0) {
    return h.div(
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

const patchSurfaceView = (model: Model, h: ApplicationViewBuilder): Html =>
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
      lazyPatchRows(patchRowsView, [model.patchRows, model.patchRun, h]),
    ],
  )

const view = (model: Model, h: ApplicationViewBuilder): Document => {
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
              [h.Class('grid gap-4 md:grid-cols-3')],
              [
                scenarioCard(
                  {
                    phase: 'Update',
                    thresholdMs: 4,
                    title: 'Slow update',
                    body: 'Runs CPU work before returning the next Model.',
                    buttonText: 'Run update work',
                    message: Message.ClickedRunUpdateWork(),
                  },
                  h,
                ),
                scenarioCard(
                  {
                    phase: 'View',
                    thresholdMs: 16,
                    title: 'Slow view',
                    body: 'Runs CPU work while the view builds the VNode tree.',
                    buttonText: 'Run view work',
                    message: Message.ClickedRunViewWork(),
                  },
                  h,
                ),
                scenarioCard(
                  {
                    phase: 'Patch',
                    thresholdMs: 8,
                    title: 'Slow patch',
                    body: 'Mounts thousands of keyed rows into the DOM.',
                    buttonText: 'Run patch work',
                    message: Message.ClickedRunPatchWork(),
                  },
                  h,
                ),
              ],
            ),
            warningsView(model.warnings, h),
            patchSurfaceView(model, h),
          ],
        ),
      ],
    ),
  }
}
