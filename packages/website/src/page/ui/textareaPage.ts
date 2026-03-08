import type { Html } from 'foldkit/html'

import { div } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { pageTitle, para, tableOfContentsEntryToHeader } from '../../prose'
import type { Message } from './message'
import type { Model } from './model'
import * as Textarea from './textarea'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  Textarea.basicHeader,
  Textarea.disabledHeader,
]

export const view = (
  model: Model,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [],
    [
      pageTitle('ui/textarea', 'Textarea'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A thin wrapper around the native textarea element that provides consistent accessibility attributes, ARIA label/description linking, and data-attribute hooks for styling.',
      ),
      ...Textarea.basicDemo(model, toMessage),
      ...Textarea.disabledDemo(model, toMessage),
    ],
  )
