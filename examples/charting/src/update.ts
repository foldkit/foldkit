import { Array, Match as M, Option, Result, pipe } from 'effect'
import { AsyncData, Command, Update } from 'foldkit'
import { evo } from 'foldkit/struct'

import { RadioGroup } from '@foldkit/ui'

import { FetchTelemetry, SyncChart } from './command'
import type { ChartMode, PackageId, Period } from './domain'
import { Message } from './message'
import { type Model, TelemetryAsyncData } from './model'
import {
  ChartModeRadioGroup,
  PackageRadioGroup,
  PeriodRadioGroup,
} from './radioGroups'

type UpdateReturn = Update.Return<Model, Message>

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
      Option.map(AsyncData.getData(args.telemetry), telemetry =>
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
  Option.match(AsyncData.revalidateOrLoad(model.telemetry), {
    onNone: () => ({ model }),
    onSome: nextTelemetry => ({
      model: evo(model, { telemetry: () => nextTelemetry }),
      commands: [FetchTelemetry()],
    }),
  })

const selectedControl =
  (updateModel: (model: Model) => Model): Update.Step<Model, Message> =>
  model => {
    const nextModel = updateModel(
      evo(model, { maybeSelectedDatumId: () => Option.none() }),
    )

    const commands = syncChart({
      maybeChartHostId: nextModel.maybeChartHostId,
      telemetry: nextModel.telemetry,
      chartMode: nextModel.chartMode,
      selectedPackageId: nextModel.selectedPackageId,
      period: nextModel.period,
      maybeSelectedDatumId: nextModel.maybeSelectedDatumId,
    })
    return Array.match(commands, {
      onEmpty: () => ({ model: nextModel }),
      onNonEmpty: commands => ({ model: nextModel, commands }),
    })
  }

const foldChartModeRadioGroupOutMessage = M.type<
  RadioGroup.OutMessage<ChartMode>
>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected: ({ value }) => selectedControl(evo({ chartMode: () => value })),
  }),
)

const foldChartModeRadioGroup = Update.foldChild({
  update: ChartModeRadioGroup.update,
  read: (model: Model) => Option.some(model.chartModeRadioGroup),
  write: (model, nextChartModeRadioGroup) =>
    evo(model, { chartModeRadioGroup: () => nextChartModeRadioGroup }),
  toParentMessage: message =>
    Message.GotChartModeRadioGroupMessage({ message }),
  foldOutMessage: foldChartModeRadioGroupOutMessage,
})

const foldPeriodRadioGroupOutMessage = M.type<
  RadioGroup.OutMessage<Period>
>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected: ({ value }) => selectedControl(evo({ period: () => value })),
  }),
)

const foldPeriodRadioGroup = Update.foldChild({
  update: PeriodRadioGroup.update,
  read: (model: Model) => Option.some(model.periodRadioGroup),
  write: (model, nextPeriodRadioGroup) =>
    evo(model, { periodRadioGroup: () => nextPeriodRadioGroup }),
  toParentMessage: message => Message.GotPeriodRadioGroupMessage({ message }),
  foldOutMessage: foldPeriodRadioGroupOutMessage,
})

const foldPackageRadioGroupOutMessage = M.type<
  RadioGroup.OutMessage<PackageId>
>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected: ({ value }) =>
      selectedControl(evo({ selectedPackageId: () => value })),
  }),
)

const foldPackageRadioGroup = Update.foldChild({
  update: PackageRadioGroup.update,
  read: (model: Model) => Option.some(model.packageRadioGroup),
  write: (model, nextPackageRadioGroup) =>
    evo(model, { packageRadioGroup: () => nextPackageRadioGroup }),
  toParentMessage: message => Message.GotPackageRadioGroupMessage({ message }),
  foldOutMessage: foldPackageRadioGroupOutMessage,
})

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    GotChartModeRadioGroupMessage: ({ message }) =>
      foldChartModeRadioGroup(model, message),

    GotPeriodRadioGroupMessage: ({ message }) =>
      foldPeriodRadioGroup(model, message),

    GotPackageRadioGroupMessage: ({ message }) =>
      foldPackageRadioGroup(model, message),

    ClickedRefresh: () => refetchTelemetry(model),

    ClickedRetry: () => refetchTelemetry(model),

    ClickedChartDatum: ({ datumId }) => ({
      model: evo(model, {
        maybeSelectedDatumId: () => Option.some(datumId),
      }),
      commands: syncChart({
        maybeChartHostId: model.maybeChartHostId,
        telemetry: model.telemetry,
        chartMode: model.chartMode,
        selectedPackageId: model.selectedPackageId,
        period: model.period,
        maybeSelectedDatumId: Option.some(datumId),
      }),
    }),

    SucceededFetchTelemetry: ({ telemetry }) => {
      const nextModel = evo(model, {
        telemetry: () => TelemetryAsyncData.Success({ data: telemetry }),
      })
      return {
        model: nextModel,
        commands: syncChart({
          maybeChartHostId: nextModel.maybeChartHostId,
          telemetry: nextModel.telemetry,
          chartMode: nextModel.chartMode,
          selectedPackageId: nextModel.selectedPackageId,
          period: nextModel.period,
          maybeSelectedDatumId: nextModel.maybeSelectedDatumId,
        }),
      }
    },

    FailedFetchTelemetry: ({ error }) => ({
      model: evo(model, {
        telemetry: () => AsyncData.settle(model.telemetry, Result.fail(error)),
      }),
    }),

    SucceededMountChart: ({ hostId }) => ({
      model: evo(model, {
        maybeChartHostId: () => Option.some(hostId),
        maybeChartError: () => Option.none(),
      }),
      commands: syncChart({
        maybeChartHostId: Option.some(hostId),
        telemetry: model.telemetry,
        chartMode: model.chartMode,
        selectedPackageId: model.selectedPackageId,
        period: model.period,
        maybeSelectedDatumId: model.maybeSelectedDatumId,
      }),
    }),

    FailedMountChart: ({ reason }) => ({
      model: evo(model, {
        maybeChartError: () => Option.some(reason),
      }),
    }),

    SucceededSyncChart: () => ({
      model: evo(model, {
        maybeChartError: () => Option.none(),
      }),
    }),

    FailedSyncChart: ({ reason }) => ({
      model: evo(model, {
        maybeChartError: () => Option.some(reason),
      }),
    }),
  })
