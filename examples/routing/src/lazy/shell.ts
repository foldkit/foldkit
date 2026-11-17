import type { Html, HtmlBuilder } from 'foldkit/html'

import type { Message } from './contracts'

export const shell = (h: HtmlBuilder<Message>, content: ReadonlyArray<Html>) =>
  h.main(
    [],
    [
      h.label([h.For('shell-note')], ['Shell note']),
      h.input([h.Id('shell-note'), h.Type('text')]),
      h.section([], content),
    ],
  )
