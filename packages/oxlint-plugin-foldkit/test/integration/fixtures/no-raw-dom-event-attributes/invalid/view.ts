import { inertHtml as ih } from 'foldkit/html'

export const reloadButton = ih.button(
  [ih.Attribute('onclick', 'location.reload()')],
  ['Reload'],
)
