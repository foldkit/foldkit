import { inertHtml as ih } from 'foldkit/html'

export const nestedIndexShadow = (values: ReadonlyArray<string>) =>
  values.map((_value, index) =>
    [index].map(index => ih.div([ih.Key(index)])),
  )
