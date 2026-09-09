import { inertHtml as ih } from 'foldkit/html'

// `online` and `onLine` are ordinary names, not DOM event handlers.
export const marker = ih.div([
  ih.Attribute('online', 'true'),
  ih.Prop({ key: 'onLine', value: true }),
])
