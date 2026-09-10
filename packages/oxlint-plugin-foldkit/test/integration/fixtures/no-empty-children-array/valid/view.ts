import type { Html, HtmlBuilder } from 'foldkit/html'

import type { Message } from './message'

export const divider = (h: HtmlBuilder<Message>): Html =>
  h.div([h.Class('h-px bg-gray-200')])

export const banner = (h: HtmlBuilder<Message>): Html =>
  h.div([h.Class('p-4')], [h.span([h.Class('font-medium')], ['Heads up'])])

export const logo = (h: HtmlBuilder<Message>): Html =>
  h.img([h.Src('logo.png'), h.Alt('Logo')])

export const spacerRow = (h: HtmlBuilder<Message>, id: string): Html =>
  h.keyed('li')(id, [h.Class('h-8')])

export const labelledRow = (
  h: HtmlBuilder<Message>,
  id: string,
  label: string,
): Html => h.keyed('li')(id, [h.Class('flex')], [h.span([], [label])])

export const placeholder = (h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('mt-4 flex flex-col gap-4')],
    [
      // Nest Input, Textarea, Checkbox, etc. here
    ],
  )

const hasher = {
  encode: (parts: ReadonlyArray<string>, salt: ReadonlyArray<string>): string =>
    [...parts, ...salt].join('-'),
}

export const digest = (h: typeof hasher): string => h.encode(['a'], [])
