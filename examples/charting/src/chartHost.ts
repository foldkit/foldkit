import type { EChartsType } from 'echarts/core'
import { Option } from 'effect'

const chartsByHostId = new Map<string, EChartsType>()

export const setChart = (hostId: string, chart: EChartsType): void => {
  chartsByHostId.set(hostId, chart)
}

export const getChart = (hostId: string): Option.Option<EChartsType> =>
  Option.fromNullishOr(chartsByHostId.get(hostId))

export const removeChart = (hostId: string, chart: EChartsType): void => {
  chart.dispose()

  if (chartsByHostId.get(hostId) === chart) {
    chartsByHostId.delete(hostId)
  }
}
