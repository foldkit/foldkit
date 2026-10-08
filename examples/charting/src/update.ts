import { Array, Layer, Option, Result, pipe } from 'effect'
import { AsyncData, Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { RadioGroup } from '@foldkit/ui'

import { CommandsLive, FetchTelemetry, SyncChart } from './command'
import type { ChartMode, PackageId, Period } from './domain'
import { Message } from './message'
import { type Model, TelemetryAsyncData } from './model'
import {
  ChartModeRadioGroup,
  PackageRadioGroup,
  PeriodRadioGroup,
} from './radioGroups'

type CommandServices = Layer.Success<typeof CommandsLive>
type UpdateReturn = Update.Return<Model, Message, CommandServices>
type UpdateStep = Update.Step<Model, Message, CommandServices>

const syncChart = (args: {
  maybeChartHostId: Model['maybeChartHostId']
  telemetry: Model['telemetry']
  chartMode: Model['chartMode']
  selectedPackageId: Model['selectedPackageId']
  period: Model['period']
  maybeSelectedDatumId: Model['maybeSelectedDatumId']
}): Update.Commands<Message, CommandServices> =>
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
      model: modifyFields(model, { telemetry: () => nextTelemetry }),
      commands: [FetchTelemetry()],
    }),
  })

const selectedControl =
  (updateModel: (model: Model) => Model): UpdateStep =>
  model => {
    const nextModel = updateModel(
      modifyFields(model, { maybeSelectedDatumId: () => Option.none() }),
    )

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
  }

const foldChartModeRadioGroupOutMessage = RadioGroup.OutMessage.match<
  UpdateStep,
  RadioGroup.OutMessage<ChartMode>
>({
  Selected: ({ value }) =>
    selectedControl(modifyFields({ chartMode: () => value })),
})

const foldChartModeRadioGroup = Update.foldChild({
  update: ChartModeRadioGroup.update,
  read: (model: Model) => Option.some(model.chartModeRadioGroup),
  write: (model, nextChartModeRadioGroup) =>
    modifyFields(model, { chartModeRadioGroup: () => nextChartModeRadioGroup }),
  toParentMessage: message =>
    Message.GotChartModeRadioGroupMessage({ message }),
  foldOutMessage: foldChartModeRadioGroupOutMessage,
})

const foldPeriodRadioGroupOutMessage = RadioGroup.OutMessage.match<
  UpdateStep,
  RadioGroup.OutMessage<Period>
>({
  Selected: ({ value }) =>
    selectedControl(modifyFields({ period: () => value })),
})

const foldPeriodRadioGroup = Update.foldChild({
  update: PeriodRadioGroup.update,
  read: (model: Model) => Option.some(model.periodRadioGroup),
  write: (model, nextPeriodRadioGroup) =>
    modifyFields(model, { periodRadioGroup: () => nextPeriodRadioGroup }),
  toParentMessage: message => Message.GotPeriodRadioGroupMessage({ message }),
  foldOutMessage: foldPeriodRadioGroupOutMessage,
})

const foldPackageRadioGroupOutMessage = RadioGroup.OutMessage.match<
  UpdateStep,
  RadioGroup.OutMessage<PackageId>
>({
  Selected: ({ value }) =>
    selectedControl(modifyFields({ selectedPackageId: () => value })),
})

const foldPackageRadioGroup = Update.foldChild({
  update: PackageRadioGroup.update,
  read: (model: Model) => Option.some(model.packageRadioGroup),
  write: (model, nextPackageRadioGroup) =>
    modifyFields(model, { packageRadioGroup: () => nextPackageRadioGroup }),
  toParentMessage: message => Message.GotPackageRadioGroupMessage({ message }),
  foldOutMessage: foldPackageRadioGroupOutMessage,
})

export const update = Update.make((model: Model, message: Message) =>
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
      model: modifyFields(model, {
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
      const nextModel = modifyFields(model, {
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
      model: modifyFields(model, {
        telemetry: () => AsyncData.settle(model.telemetry, Result.fail(error)),
      }),
    }),

    SucceededMountChart: ({ hostId }) => ({
      model: modifyFields(model, {
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
      model: modifyFields(model, {
        maybeChartError: () => Option.some(reason),
      }),
    }),

    SucceededSyncChart: () => ({
      model: modifyFields(model, {
        maybeChartError: () => Option.none(),
      }),
    }),

    FailedSyncChart: ({ reason }) => ({
      model: modifyFields(model, {
        maybeChartError: () => Option.some(reason),
      }),
    }),
  }),
)
