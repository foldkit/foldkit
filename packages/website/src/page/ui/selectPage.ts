import type { Html } from 'foldkit/html'

import { div } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { pageTitle, para, tableOfContentsEntryToHeader } from '../../prose'
import type { Message } from './message'
import type { Model } from './model'
import * as Select from './select'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  Select.basicHeader,
  Select.disabledHeader,
]

export const view = (
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [],
    [
      pageTitle('ui/select', 'Select'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A thin wrapper around the native select element that provides consistent accessibility attributes, ARIA label/description linking, and data-attribute hooks for styling.',
      ),
      ...Select.basicDemo(model, toParentMessage),
      ...Select.disabledDemo(model, toParentMessage),
    ],
  )
