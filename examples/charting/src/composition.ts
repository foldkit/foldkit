import { Array, Option, pipe } from 'effect'
import { AsyncData, type Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import {
  makeComposition,
  makeOutMessageFold,
  makeRequiredFieldBinding,
  makeStep,
} from './block'
import { FetchTelemetry, SyncChart } from './command'
import { Model } from './model'
import { MountChart } from './mount'
import {
  CHART_MODE_RADIO_GROUP_ID,
  ChartModeRadioGroupBlock,
  PACKAGE_RADIO_GROUP_ID,
  PERIOD_RADIO_GROUP_ID,
  PackageRadioGroupBlock,
  PeriodRadioGroupBlock,
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

const selectControl = (updateModel: (model: Model) => Model) =>
  makeStep(model => {
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
  })

export const ChartModeRadioGroupBinding = makeRequiredFieldBinding(
  ChartModeRadioGroupBlock,
  {
    field: 'chartModeRadioGroup',
    init: { contextToArgs: () => [{ id: CHART_MODE_RADIO_GROUP_ID }] },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(ChartModeRadioGroupBlock, {
    Selected: ({ value }) =>
      selectControl(modifyFields({ chartMode: () => value })),
  }),
})

export const PeriodRadioGroupBinding = makeRequiredFieldBinding(
  PeriodRadioGroupBlock,
  {
    field: 'periodRadioGroup',
    init: { contextToArgs: () => [{ id: PERIOD_RADIO_GROUP_ID }] },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(PeriodRadioGroupBlock, {
    Selected: ({ value }) =>
      selectControl(modifyFields({ period: () => value })),
  }),
})

export const PackageRadioGroupBinding = makeRequiredFieldBinding(
  PackageRadioGroupBlock,
  {
    field: 'packageRadioGroup',
    init: { contextToArgs: () => [{ id: PACKAGE_RADIO_GROUP_ID }] },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(PackageRadioGroupBlock, {
    Selected: ({ value }) =>
      selectControl(modifyFields({ selectedPackageId: () => value })),
  }),
})

export const ApplicationComposition = makeComposition({
  mounts: [MountChart],
  bindings: [
    ChartModeRadioGroupBinding,
    PeriodRadioGroupBinding,
    PackageRadioGroupBinding,
  ],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
