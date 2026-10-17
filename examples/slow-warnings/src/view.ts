import { Array, Match } from 'effect'
import { type Html, createLazy } from 'foldkit/html'

import {
  ApplicationComposition,
  type ApplicationViewBuilder,
} from './composition'
import { Message } from './message'
import {
  type Model,
  type SlowPhase,
  type SlowWarning,
  type Workload,
} from './model'
import { VIEW_WORK_MS, burnCpu } from './workload'

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

export const view = ApplicationComposition.makeView((model, h) => {
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
                scenarioCard(
                  {
                    phase: 'SubscriptionDependencies',
                    thresholdMs: 2,
                    title: 'Slow subscription dependencies',
                    body: 'Burns CPU while deriving subscription dependencies.',
                    buttonText: 'Run dependency extraction',
                    message: Message.ClickedRunSubscriptionDependenciesWork(),
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
})
