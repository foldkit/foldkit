/*
import type { HtmlBuilder } from 'foldkit/html'
export type ChartViewBuilder = HtmlBuilder<never>
*/

const example = `
import type { HtmlBuilder } from 'foldkit/html'
export type ChartViewBuilder = HtmlBuilder<never>
`

export type ChartViewBuilder = Readonly<{
  Attribute: (name: string, value: string) => unknown
}>

export const provenanceExample = example
