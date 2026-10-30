export type ChartViewBuilder = Readonly<{
  Attribute: (name: string, value: string) => unknown
}>
