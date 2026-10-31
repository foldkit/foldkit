import * as echarts from 'echarts/core'
import {
  Array,
  Clock,
  Effect,
  Option,
  Queue,
  Result,
  Schema,
  Stream,
  pipe,
} from 'effect'
import { AsyncData, Block, Command, Mount } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button } from '@foldkit/ui'

import { ChartRegistry } from './domain/chartRegistry'
import {
  type ChartOptionArgs,
  makeChartOption,
  selectedDatumLabel,
} from './domain/echarts'
import { fetchRawTelemetry, transformTelemetry } from './domain/fetchTelemetry'
import { formatInteger } from './domain/format'
import { GitHubApi } from './domain/githubApi'
import { NpmApi } from './domain/npmApi'
import { ChartMode, PackageId, Period, Telemetry } from './domain/telemetry'
import { Sidebar } from './sidebar'

export const CHART_HOST_ID = 'charting-chart'

// MODEL

export const TelemetryAsyncData = AsyncData.Schema(Telemetry, Schema.String)

export const Model = Schema.Struct({
  telemetry: TelemetryAsyncData.schema,
  sidebar: Sidebar,
  maybeChartHostId: Schema.Option(Schema.String),
  maybeChartError: Schema.Option(Schema.String),
  maybeSelectedDatumId: Schema.Option(Schema.String),
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedRefresh: {},
  ClickedRetry: {},
  ClickedChartDatum: { datumId: Schema.String },
  SucceededFetchTelemetry: { telemetry: Telemetry },
  FailedFetchTelemetry: { error: Schema.String },
  SucceededMountChart: { hostId: Schema.String },
  FailedMountChart: { reason: Schema.String },
  SucceededSyncChart: {},
  FailedSyncChart: { reason: Schema.String },
})
export type Message = typeof Message.Type
type SucceededMountChart = typeof Message.SucceededMountChart.Type
type FailedMountChart = typeof Message.FailedMountChart.Type
type ClickedChartDatum = typeof Message.ClickedChartDatum.Type

// COMMAND

export const FetchTelemetry = Command.define('FetchTelemetry', {
  messages: [Message.SucceededFetchTelemetry, Message.FailedFetchTelemetry],
})

export const SyncChart = Command.define('SyncChart', {
  args: {
    hostId: Schema.String,
    telemetry: Telemetry,
    chartMode: ChartMode,
    selectedPackageId: PackageId,
    period: Period,
    maybeSelectedDatumId: Schema.Option(Schema.String),
  },
  messages: [Message.SucceededSyncChart, Message.FailedSyncChart],
})

// MOUNT

export const MountChart = Mount.defineStream('MountChart', {
  args: { hostId: Schema.String },
  messages: [
    Message.SucceededMountChart,
    Message.FailedMountChart,
    Message.ClickedChartDatum,
  ],
})

export class Application extends Block<Application>()('Application', {
  Model,
  Message,
  Command: [FetchTelemetry, SyncChart],
  Mount: [MountChart],
}) {}

// LIVE

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    const github = yield* GitHubApi
    const npm = yield* NpmApi
    const clock = yield* Clock.Clock
    const charts = yield* ChartRegistry

    const sidebar = yield* new Sidebar('sidebar')

    return {
      model: {
        telemetry: TelemetryAsyncData.Loading(),
        sidebar,
        maybeChartHostId: Option.none(),
        maybeChartError: Option.none(),
        maybeSelectedDatumId: Option.none(),
      },

      start: [FetchTelemetry()],

      update: {
        ClickedRefresh: refetchTelemetry,
        ClickedRetry: refetchTelemetry,

        ClickedChartDatum: (model, { datumId }) => {
          const nextModel = modifyFields(model, {
            maybeSelectedDatumId: () => Option.some(datumId),
          })

          return { model: nextModel, commands: syncChart(nextModel) }
        },

        SucceededFetchTelemetry: (model, { telemetry }) => {
          const nextModel = modifyFields(model, {
            telemetry: () => TelemetryAsyncData.Success({ data: telemetry }),
          })

          return { model: nextModel, commands: syncChart(nextModel) }
        },

        FailedFetchTelemetry: (model, { error }) => ({
          model: modifyFields(model, {
            telemetry: () =>
              AsyncData.settle(model.telemetry, Result.fail(error)),
          }),
        }),

        SucceededMountChart: (model, { hostId }) => {
          const nextModel = modifyFields(model, {
            maybeChartHostId: () => Option.some(hostId),
            maybeChartError: () => Option.none(),
          })

          return { model: nextModel, commands: syncChart(nextModel) }
        },

        FailedMountChart: (model, { reason }) => ({
          model: modifyFields(model, {
            maybeChartError: () => Option.some(reason),
          }),
        }),

        SucceededSyncChart: model => ({
          model: modifyFields(model, { maybeChartError: () => Option.none() }),
        }),

        FailedSyncChart: (model, { reason }) => ({
          model: modifyFields(model, {
            maybeChartError: () => Option.some(reason),
          }),
        }),

        ...sidebar.on({
          UpdatedChartControls: clearSelectedDatumStep,
        }),
      },

      commands: {
        FetchTelemetry: () => fetchTelemetry({ github, npm, clock }),
        SyncChart: args => syncChartOption(charts, args),
      },

      mounts: {
        MountChart: ({ element, hostId }) =>
          mountChart(charts, element, hostId),
      },

      view: (model, h) => ({
        title: 'Foldkit Adoption Observatory',
        body: h.div(
          [h.Class('min-h-screen bg-zinc-50 text-zinc-950')],
          [
            h.main(
              [
                h.Class(
                  'mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8',
                ),
              ],
              [headerView(model, h), telemetryStateView(model, h)],
            ),
          ],
        ),
      }),
    }
  }),
)

// UPDATE

const syncChart = (model: Model) =>
  pipe(
    model.maybeChartHostId,
    Option.flatMap(hostId =>
      Option.map(AsyncData.getData(model.telemetry), telemetry =>
        SyncChart({
          hostId,
          telemetry,
          chartMode: model.sidebar.model.chartMode,
          selectedPackageId: model.sidebar.model.selectedPackageId,
          period: model.sidebar.model.period,
          maybeSelectedDatumId: model.maybeSelectedDatumId,
        }),
      ),
    ),
    Array.fromOption,
  )

const refetchTelemetry = (model: Model) =>
  Option.match(AsyncData.revalidateOrLoad(model.telemetry), {
    onNone: () => ({ model }),
    onSome: nextTelemetry => ({
      model: modifyFields(model, { telemetry: () => nextTelemetry }),
      commands: [FetchTelemetry()],
    }),
  })

const clearSelectedDatumStep = (model: Model) => {
  const nextModel = modifyFields(model, {
    maybeSelectedDatumId: () => Option.none(),
  })

  return { model: nextModel, commands: syncChart(nextModel) }
}

// COMMAND HANDLER

const fetchTelemetry = (
  services: Readonly<{
    github: typeof GitHubApi.Service
    npm: typeof NpmApi.Service
    clock: typeof Clock.Clock.Service
  }>,
) =>
  Effect.gen(function* () {
    const rawTelemetry = yield* fetchRawTelemetry(services)
    const telemetry = transformTelemetry(rawTelemetry)
    return Message.SucceededFetchTelemetry({ telemetry })
  }).pipe(
    Effect.catch(error =>
      Effect.succeed(
        Message.FailedFetchTelemetry({
          error: error instanceof Error ? error.message : `${error}`,
        }),
      ),
    ),
  )

const syncChartOption = (
  charts: typeof ChartRegistry.Service,
  args: ChartOptionArgs & Readonly<{ hostId: string }>,
) =>
  Effect.gen(function* () {
    const maybeChart = yield* charts.get(args.hostId)

    return yield* Option.match(maybeChart, {
      onNone: () =>
        Effect.succeed(
          Message.FailedSyncChart({
            reason: `Could not find a live chart for hostId ${args.hostId}.`,
          }),
        ),
      onSome: chart =>
        Effect.try(() => chart.setOption(makeChartOption(args), true)).pipe(
          Effect.as(Message.SucceededSyncChart()),
          Effect.catch(error =>
            Effect.succeed(
              Message.FailedSyncChart({
                reason: error instanceof Error ? error.message : `${error}`,
              }),
            ),
          ),
        ),
    })
  })

// MOUNT HANDLER

type MountChartMessage =
  | SucceededMountChart
  | FailedMountChart
  | ClickedChartDatum

const toChartMountError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(`Failed to mount chart: ${error}`)

const ChartClickEvent = Schema.Struct({
  data: Schema.OptionFromOptional(Schema.Struct({ id: Schema.String })),
})
type ChartClickEvent = typeof ChartClickEvent.Type

const datumIdFromChartClickEvent = (event: unknown): Option.Option<string> =>
  pipe(
    event,
    Schema.decodeUnknownOption(ChartClickEvent),
    Option.flatMap(({ data }) => data),
    Option.map(({ id }) => id),
  )

const observeChartResizeAndClickEvents = (
  element: HTMLElement,
  chart: ReturnType<typeof echarts.init>,
  queue: Queue.Enqueue<MountChartMessage>,
) =>
  Effect.acquireRelease(
    Effect.try({
      try: () => {
        const resizeObserver = new ResizeObserver(() => chart.resize())
        const onWindowResize = () => chart.resize()
        const onClick = (event: unknown) => {
          const maybeDatumId = datumIdFromChartClickEvent(event)

          if (Option.isSome(maybeDatumId)) {
            Queue.offerUnsafe(
              queue,
              Message.ClickedChartDatum({ datumId: maybeDatumId.value }),
            )
          }
        }

        try {
          resizeObserver.observe(element)
          window.addEventListener('resize', onWindowResize)
          chart.on('click', onClick)
          return { resizeObserver, onWindowResize, onClick }
        } catch (error) {
          chart.off('click', onClick)
          window.removeEventListener('resize', onWindowResize)
          resizeObserver.disconnect()
          throw error
        }
      },
      catch: toChartMountError,
    }),
    ({ resizeObserver, onWindowResize, onClick }) =>
      Effect.sync(() => {
        chart.off('click', onClick)
        window.removeEventListener('resize', onWindowResize)
        resizeObserver.disconnect()
      }),
  )

const mountChart = (
  charts: typeof ChartRegistry.Service,
  element: Element,
  hostId: string,
) =>
  Stream.callback<MountChartMessage>(queue =>
    Effect.gen(function* () {
      if (!(element instanceof HTMLElement)) {
        Queue.offerUnsafe(
          queue,
          Message.FailedMountChart({
            reason: 'Chart host is not an HTMLElement.',
          }),
        )
        return yield* Effect.never
      }

      const chart = yield* Effect.acquireRelease(
        Effect.try({
          try: () => echarts.init(element, undefined, { renderer: 'canvas' }),
          catch: toChartMountError,
        }),
        chart =>
          Effect.sync(() => chart.dispose()).pipe(
            Effect.ensuring(charts.remove(hostId, chart)),
          ),
      )
      yield* charts.set(hostId, chart)

      yield* observeChartResizeAndClickEvents(element, chart, queue)

      Queue.offerUnsafe(queue, Message.SucceededMountChart({ hostId }))
      return yield* Effect.never
    }).pipe(
      Effect.catch(error =>
        Effect.sync(() =>
          Queue.offerUnsafe(
            queue,
            Message.FailedMountChart({ reason: error.message }),
          ),
        ),
      ),
    ),
  )

// VIEW

type ApplicationViewBuilder = HtmlBuilder<
  Message,
  Mount.RequirementsOf<typeof MountChart>
>

const headerView = (model: Model, h: ApplicationViewBuilder): Html => {
  const isRefreshing = AsyncData.isRefreshing(model.telemetry)
  const isLoading = AsyncData.isLoading(model.telemetry)

  return h.header(
    [
      h.Class(
        'flex flex-col gap-3 border-b border-zinc-200 pb-4 md:flex-row md:items-end md:justify-between',
      ),
    ],
    [
      h.div(
        [],
        [
          h.p(
            [
              h.Class(
                'text-xs font-semibold uppercase tracking-wider text-emerald-700',
              ),
            ],
            ['Live public telemetry'],
          ),
          h.h1(
            [
              h.Class(
                'mt-1 text-2xl font-semibold tracking-tight text-zinc-950',
              ),
            ],
            ['Foldkit Adoption Observatory'],
          ),
        ],
      ),
      Button.view(
        {
          onClick: Message.ClickedRefresh(),
          isDisabled: isRefreshing || isLoading,
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(
                  'inline-flex min-h-10 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
                ),
              ],
              [isRefreshing ? 'Refreshing' : 'Refresh'],
            ),
        },
        h,
      ),
    ],
  )
}

const dashboardBanner = (
  telemetry: Model['telemetry'],
): Option.Option<string> =>
  AsyncData.match(telemetry, {
    onIdle: () => Option.none(),
    onLoading: () => Option.none(),
    onRefreshing: () => Option.some('Refreshing public data'),
    onFailure: () => Option.none(),
    onStale: ({ error }) => Option.some(error),
    onSuccess: ({ warnings }) =>
      Array.match(warnings, {
        onEmpty: () => Option.none(),
        onNonEmpty: warnings => Option.some(Array.join(warnings, ' ')),
      }),
  })

const telemetryStateView = (model: Model, h: ApplicationViewBuilder): Html =>
  AsyncData.matchData(model.telemetry, {
    onEmpty: () => loadingView(h),
    onFailure: error => failureView(error, h),
    onData: data =>
      dashboardShellView(model, data, dashboardBanner(model.telemetry), h),
  })

const loadingView = (h: ApplicationViewBuilder): Html =>
  h.section(
    [
      h.Class(
        'grid flex-1 place-items-center rounded-md border border-zinc-200 bg-white px-6 py-16',
      ),
      h.AriaLabel('Loading telemetry'),
    ],
    [
      h.div(
        [h.Class('text-center')],
        [
          h.div([
            h.Class(
              'mx-auto h-8 w-8 rounded-full border-2 border-zinc-200 border-t-emerald-600 motion-safe:animate-spin',
            ),
            h.AriaLabel('Loading'),
          ]),
          h.p(
            [h.Class('mt-4 text-sm font-medium text-zinc-700')],
            ['Fetching public telemetry'],
          ),
        ],
      ),
    ],
  )

const failureView = (error: string, h: ApplicationViewBuilder): Html =>
  h.section(
    [
      h.Class(
        'grid flex-1 place-items-center rounded-md border border-rose-200 bg-rose-50 px-6 py-16 text-center',
      ),
      h.AriaLabel('Telemetry failed'),
    ],
    [
      h.div(
        [h.Class('max-w-lg')],
        [
          h.h2(
            [h.Class('text-lg font-semibold text-rose-950')],
            ['Could not fetch telemetry'],
          ),
          h.p([h.Class('mt-2 text-sm text-rose-800')], [error]),
          Button.view(
            {
              onClick: Message.ClickedRetry(),
              toView: attributes =>
                h.button(
                  [
                    ...attributes.button,
                    h.Class(
                      'mt-5 inline-flex min-h-10 items-center justify-center rounded-md bg-rose-700 px-4 text-sm font-medium text-white hover:bg-rose-800',
                    ),
                  ],
                  ['Retry'],
                ),
            },
            h,
          ),
        ],
      ),
    ],
  )

const dashboardShellView = (
  model: Model,
  telemetry: Telemetry,
  maybeBanner: Option.Option<string>,
  h: ApplicationViewBuilder,
): Html =>
  h.section(
    [
      h.Class(
        'grid flex-1 gap-5 md:grid-cols-[18rem_minmax(0,1fr)] lg:grid-cols-[20rem_minmax(0,1fr)]',
      ),
    ],
    [
      model.sidebar.view({ telemetry, maybeBanner }),
      chartPanelView(model, telemetry, h),
    ],
  )

const chartPanelView = (
  model: Model,
  telemetry: Telemetry,
  h: ApplicationViewBuilder,
): Html =>
  h.section(
    [
      h.Class(
        'grid min-h-[32rem] self-start grid-rows-[minmax(0,1fr)_auto] rounded-md border border-zinc-200 bg-white',
      ),
    ],
    [
      h.div([
        h.Class('min-h-[26rem] w-full'),
        h.AriaLabel('Adoption chart'),
        h.OnMount(MountChart({ hostId: CHART_HOST_ID })),
      ]),
      chartFooterView(model, telemetry, h),
    ],
  )

const chartFooterView = (
  model: Model,
  telemetry: Telemetry,
  h: ApplicationViewBuilder,
): Html =>
  h.div(
    [
      h.Class(
        'flex flex-col gap-3 border-t border-zinc-200 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between',
      ),
    ],
    [
      h.div(
        [],
        [
          h.div(
            [h.Class('font-medium text-zinc-900')],
            [chartFooterLabel(model, telemetry)],
          ),
          h.div(
            [h.Class('text-xs text-zinc-500')],
            [`Default branch: ${telemetry.repository.defaultBranch}`],
          ),
        ],
      ),
      chartStatusView(model, h),
    ],
  )

const chartFooterLabel = (model: Model, telemetry: Telemetry): string =>
  Option.getOrElse(
    selectedDatumLabel(telemetry, model.maybeSelectedDatumId),
    () =>
      `${formatInteger(telemetry.repository.openIssues)} open issues, ${formatInteger(
        telemetry.repository.openPullRequests,
      )} open pull requests`,
  )

const chartStatusView = (model: Model, h: ApplicationViewBuilder): Html =>
  Option.match(model.maybeChartError, {
    onNone: () =>
      h.div([h.Class('text-xs font-medium text-emerald-700')], ['Chart ready']),
    onSome: error =>
      h.div([h.Class('max-w-md text-xs font-medium text-rose-700')], [error]),
  })
