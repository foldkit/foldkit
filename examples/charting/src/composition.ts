import { Array, Option, pipe } from 'effect'
import { AsyncData, type Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { FetchTelemetry, SyncChart } from './command'
import { Application } from './definition'
import { Message } from './message'
import { Model } from './model'
import { MountChart } from './mount'
import {
  CHART_MODE_RADIO_GROUP_ID,
  ChartModeRadioGroup,
  PACKAGE_RADIO_GROUP_ID,
  PERIOD_RADIO_GROUP_ID,
  PackageRadioGroup,
  PeriodRadioGroup,
} from './radioGroups'

export const syncChart = (args: {
  maybeChartHostId: Model['maybeChartHostId']
  telemetry: Model['telemetry']
  chartMode: Model['chartMode']
  selectedPackageId: Model['selectedPackageId']
  period: Model['period']
  maybeSelectedDatumId: Model['maybeSelectedDatumId']
}) =>
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

export const refetchTelemetry = (model: Model) =>
  Option.match(AsyncData.revalidateOrLoad(model.telemetry), {
    onNone: () => ({ model }),
    onSome: nextTelemetry => ({
      model: modifyFields(model, { telemetry: () => nextTelemetry }),
      commands: [FetchTelemetry()],
    }),
  })

const selectedControl =
  (updateModel: (model: Model) => Model) => (model: Model) => {
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

const foldChartModeRadioGroupOutMessage = ChartModeRadioGroup.OutMessage.match({
  Selected: ({ value }) =>
    selectedControl(modifyFields({ chartMode: () => value })),
})

export const ChartModeRadioGroupBinding = Application.bindChild(
  ChartModeRadioGroup,
  {
    field: 'chartModeRadioGroup',
    parentMessage: Message.GotChartModeRadioGroupMessage,
    init: { args: () => [{ id: CHART_MODE_RADIO_GROUP_ID }] },
    outMessage: { fold: foldChartModeRadioGroupOutMessage },
  },
)

const foldPeriodRadioGroupOutMessage = PeriodRadioGroup.OutMessage.match({
  Selected: ({ value }) =>
    selectedControl(modifyFields({ period: () => value })),
})

export const PeriodRadioGroupBinding = Application.bindChild(PeriodRadioGroup, {
  field: 'periodRadioGroup',
  parentMessage: Message.GotPeriodRadioGroupMessage,
  init: { args: () => [{ id: PERIOD_RADIO_GROUP_ID }] },
  outMessage: { fold: foldPeriodRadioGroupOutMessage },
})

const foldPackageRadioGroupOutMessage = PackageRadioGroup.OutMessage.match({
  Selected: ({ value }) =>
    selectedControl(modifyFields({ selectedPackageId: () => value })),
})

export const PackageRadioGroupBinding = Application.bindChild(
  PackageRadioGroup,
  {
    field: 'packageRadioGroup',
    parentMessage: Message.GotPackageRadioGroupMessage,
    init: { args: () => [{ id: PACKAGE_RADIO_GROUP_ID }] },
    outMessage: { fold: foldPackageRadioGroupOutMessage },
  },
)

export const ApplicationComposition = Application.makeComposition({
  mounts: [MountChart],
  childBindings: [
    ChartModeRadioGroupBinding,
    PeriodRadioGroupBinding,
    PackageRadioGroupBinding,
  ],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
