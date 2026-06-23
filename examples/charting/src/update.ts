import { Array, Match as M, Option, pipe } from 'effect'
import { Command } from 'foldkit'
import { evo } from 'foldkit/struct'

import { FetchTelemetry, SyncChart } from './command'
import type { Telemetry } from './domain'
import {
  GotChartModeRadioGroupMessage,
  GotPackageIdRadioGroupMessage,
  GotPeriodRadioGroupMessage,
  type Message,
} from './message'
import {
  type Model,
  TelemetryFailure,
  TelemetryLoading,
  TelemetryOk,
  TelemetryRefreshing,
  type TelemetryState,
} from './model'
import {
  ChartModeRadioGroup,
  PackageIdRadioGroup,
  PeriodRadioGroup,
} from './radioGroups'

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const telemetryData = (telemetry: TelemetryState): Option.Option<Telemetry> =>
  M.value(telemetry).pipe(
    M.tagsExhaustive({
      TelemetryNotAsked: () => Option.none(),
      TelemetryLoading: () => Option.none(),
      TelemetryRefreshing: ({ data }) => Option.some(data),
      TelemetryFailure: ({ maybeData }) => maybeData,
      TelemetryOk: ({ data }) => Option.some(data),
    }),
  )

const syncChart = (args: {
  maybeChartHostId: Model['maybeChartHostId']
  telemetry: Model['telemetry']
  chartMode: Model['chartMode']
  selectedPackageId: Model['selectedPackageId']
  period: Model['period']
  maybeSelectedDatumId: Model['maybeSelectedDatumId']
}): ReadonlyArray<Command.Command<Message>> =>
  pipe(
    args.maybeChartHostId,
    Option.flatMap(hostId =>
      Option.map(telemetryData(args.telemetry), telemetry =>
        SyncChart({
          hostId,
          telemetry,
          chartMode: args.chartMode,
          selectedPackageId: args.selectedPackageId,
          period: args.period,
          maybeSelectedDatumId: args.maybeSelectedDatumId,
        }),
      ),
    ),
    Array.fromOption,
  )

const refetchTelemetry = (model: Model): UpdateReturn =>
  M.value(model.telemetry).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      TelemetryNotAsked: () => [
        evo(model, {
          telemetry: () => TelemetryLoading(),
        }),
        [FetchTelemetry()],
      ],
      TelemetryLoading: () => [model, []],
      TelemetryRefreshing: () => [model, []],
      TelemetryFailure: ({ maybeData }) => [
        evo(model, {
          telemetry: () =>
            Option.match(maybeData, {
              onNone: () => TelemetryLoading(),
              onSome: data => TelemetryRefreshing({ data }),
            }),
        }),
        [FetchTelemetry()],
      ],
      TelemetryOk: ({ data }) => [
        evo(model, {
          telemetry: () => TelemetryRefreshing({ data }),
        }),
        [FetchTelemetry()],
      ],
    }),
  )

const selectedControl = (
  model: Model,
  updateModel: (model: Model) => Model,
): UpdateReturn => {
  const nextModel = updateModel(
    evo(model, { maybeSelectedDatumId: () => Option.none() }),
  )

  return [
    nextModel,
    syncChart({
      maybeChartHostId: nextModel.maybeChartHostId,
      telemetry: nextModel.telemetry,
      chartMode: nextModel.chartMode,
      selectedPackageId: nextModel.selectedPackageId,
      period: nextModel.period,
      maybeSelectedDatumId: nextModel.maybeSelectedDatumId,
    }),
  ]
}

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      SelectedChartMode: ({ chartMode }) =>
        selectedControl(
          evo(model, {
            chartModeRadioGroup: () =>
              ChartModeRadioGroup.reflectSelectedValue(
                model.chartModeRadioGroup,
                Option.some(chartMode),
              ),
          }),
          current =>
            evo(current, {
              chartMode: () => chartMode,
            }),
        ),

      SelectedPeriod: ({ period }) =>
        selectedControl(
          evo(model, {
            periodRadioGroup: () =>
              PeriodRadioGroup.reflectSelectedValue(
                model.periodRadioGroup,
                Option.some(period),
              ),
          }),
          current =>
            evo(current, {
              period: () => period,
            }),
        ),

      ClickedRefresh: () => refetchTelemetry(model),

      ClickedRetry: () => refetchTelemetry(model),

      ClickedChartDatum: ({ datumId }) => [
        evo(model, {
          maybeSelectedDatumId: () => Option.some(datumId),
        }),
        syncChart({
          maybeChartHostId: model.maybeChartHostId,
          telemetry: model.telemetry,
          chartMode: model.chartMode,
          selectedPackageId: model.selectedPackageId,
          period: model.period,
          maybeSelectedDatumId: Option.some(datumId),
        }),
      ],

      SucceededFetchTelemetry: ({ telemetry }) => {
        const nextModel = evo(model, {
          telemetry: () => TelemetryOk({ data: telemetry }),
        })
        return [
          nextModel,
          syncChart({
            maybeChartHostId: nextModel.maybeChartHostId,
            telemetry: nextModel.telemetry,
            chartMode: nextModel.chartMode,
            selectedPackageId: nextModel.selectedPackageId,
            period: nextModel.period,
            maybeSelectedDatumId: nextModel.maybeSelectedDatumId,
          }),
        ]
      },

      FailedFetchTelemetry: ({ error }) => [
        evo(model, {
          telemetry: () =>
            TelemetryFailure({
              error,
              maybeData: telemetryData(model.telemetry),
            }),
        }),
        [],
      ],

      SucceededMountChart: ({ hostId }) => [
        evo(model, {
          maybeChartHostId: () => Option.some(hostId),
          maybeChartError: () => Option.none(),
        }),
        syncChart({
          maybeChartHostId: Option.some(hostId),
          telemetry: model.telemetry,
          chartMode: model.chartMode,
          selectedPackageId: model.selectedPackageId,
          period: model.period,
          maybeSelectedDatumId: model.maybeSelectedDatumId,
        }),
      ],

      FailedMountChart: ({ reason }) => [
        evo(model, {
          maybeChartError: () => Option.some(reason),
        }),
        [],
      ],

      CompletedSyncChart: () => [
        evo(model, {
          maybeChartError: () => Option.none(),
        }),
        [],
      ],

      FailedSyncChart: ({ reason }) => [
        evo(model, {
          maybeChartError: () => Option.some(reason),
        }),
        [],
      ],

      SelectedPackage: ({ packageId }) =>
        selectedControl(
          evo(model, {
            packageIdRadioGroup: () =>
              PackageIdRadioGroup.reflectSelectedValue(
                model.packageIdRadioGroup,
                Option.some(packageId),
              ),
          }),
          current =>
            evo(current, {
              selectedPackageId: () => packageId,
            }),
        ),

      GotPackageIdRadioGroupMessage: ({ message: radioGroupMessage }) => {
        const [nextRadioGroup, radioGroupCommands, maybeOut] =
          PackageIdRadioGroup.update(
            model.packageIdRadioGroup,
            radioGroupMessage,
          )

        const mappedCommands = Command.mapMessages(
          radioGroupCommands,
          message => GotPackageIdRadioGroupMessage({ message }),
        )

        const nextModel = evo(model, {
          packageIdRadioGroup: () => nextRadioGroup,
        })

        return Option.match(maybeOut, {
          onNone: () => [nextModel, mappedCommands],
          onSome: ({ value }) => [
            evo(nextModel, {
              selectedPackageId: () => value,
              maybeSelectedDatumId: () => Option.none(),
            }),
            [
              ...mappedCommands,
              ...syncChart({
                maybeChartHostId: nextModel.maybeChartHostId,
                telemetry: nextModel.telemetry,
                chartMode: nextModel.chartMode,
                selectedPackageId: value,
                period: nextModel.period,
                maybeSelectedDatumId: Option.none(),
              }),
            ],
          ],
        })
      },

      GotChartModeRadioGroupMessage: ({ message: radioGroupMessage }) => {
        const [nextRadioGroup, radioGroupCommands, maybeOut] =
          ChartModeRadioGroup.update(
            model.chartModeRadioGroup,
            radioGroupMessage,
          )

        const mappedCommands = Command.mapMessages(
          radioGroupCommands,
          message => GotChartModeRadioGroupMessage({ message }),
        )

        const nextModel = evo(model, {
          chartModeRadioGroup: () => nextRadioGroup,
        })

        return Option.match(maybeOut, {
          onNone: () => [nextModel, mappedCommands],
          onSome: ({ value }) => [
            evo(nextModel, {
              chartMode: () => value,
              maybeSelectedDatumId: () => Option.none(),
            }),
            [
              ...mappedCommands,
              ...syncChart({
                maybeChartHostId: nextModel.maybeChartHostId,
                telemetry: nextModel.telemetry,
                chartMode: value,
                selectedPackageId: nextModel.selectedPackageId,
                period: nextModel.period,
                maybeSelectedDatumId: Option.none(),
              }),
            ],
          ],
        })
      },

      GotPeriodRadioGroupMessage: ({ message: radioGroupMessage }) => {
        const [nextRadioGroup, radioGroupCommands, maybeOut] =
          PeriodRadioGroup.update(model.periodRadioGroup, radioGroupMessage)

        const mappedCommands = Command.mapMessages(
          radioGroupCommands,
          message => GotPeriodRadioGroupMessage({ message }),
        )

        const nextModel = evo(model, { periodRadioGroup: () => nextRadioGroup })

        return Option.match(maybeOut, {
          onNone: () => [nextModel, mappedCommands],
          onSome: ({ value }) => [
            evo(nextModel, {
              period: () => value,
              maybeSelectedDatumId: () => Option.none(),
            }),
            [
              ...mappedCommands,
              ...syncChart({
                maybeChartHostId: nextModel.maybeChartHostId,
                telemetry: nextModel.telemetry,
                chartMode: nextModel.chartMode,
                selectedPackageId: nextModel.selectedPackageId,
                period: value,
                maybeSelectedDatumId: Option.none(),
              }),
            ],
          ],
        })
      },
    }),
  )
