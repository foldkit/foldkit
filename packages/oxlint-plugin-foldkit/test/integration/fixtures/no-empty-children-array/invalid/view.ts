import type { Html, HtmlBuilder } from 'foldkit/html'

import type { Message } from './message'

export const divider = (h: HtmlBuilder<Message>): Html =>
  h.div([h.Class('h-px bg-gray-200')], [])

export const spacerRow = (h: HtmlBuilder<Message>, id: string): Html =>
  h.keyed('li')(id, [h.Class('h-8')], [])
