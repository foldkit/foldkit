import type { Html, HtmlBuilder } from 'foldkit/html'

import { issuesRouter } from '../route'

export const missingPage = <Message, MountRequirements>(
  title: string,
  description: string,
  h: HtmlBuilder<Message, MountRequirements>,
): Html =>
  h.section(
    [h.Class('grid min-h-80 place-content-center gap-3 px-8 text-center')],
    [
      h.h2([h.Class('text-lg font-semibold text-slate-700')], [title]),
      h.p([h.Class('text-sm text-slate-500')], [description]),
      h.a(
        [
          h.Href(issuesRouter({})),
          h.Class('mt-2 text-sm font-semibold text-indigo-600'),
        ],
        ['Back to all issues'],
      ),
    ],
  )
