import type { Html } from 'foldkit/html'

import { div } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { pageTitle, para, tableOfContentsEntryToHeader } from '../../prose'
import * as Checkbox from './checkbox'
import type { Message } from './message'
import type { Model } from './model'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  Checkbox.basicHeader,
  Checkbox.indeterminateHeader,
]

export const view = (
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [],
    [
      pageTitle('ui/checkbox', 'Checkbox'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A checkbox for toggling a checked state with accessible labeling, keyboard support, indeterminate state, and optional form integration via a hidden input.',
      ),
      ...Checkbox.basicDemo(model, toParentMessage),
      ...Checkbox.indeterminateDemo(model, toParentMessage),
    ],
  )
