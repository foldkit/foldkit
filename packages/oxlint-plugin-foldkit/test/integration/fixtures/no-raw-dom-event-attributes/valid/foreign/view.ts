import type { ChartViewBuilder } from './builder'

export const rawAttributeForAnotherLibrary = (h: ChartViewBuilder) =>
  h.Attribute('onclick', 'drawChart()')
