import type { Html } from 'foldkit/html'

import { div } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { pageTitle, para, tableOfContentsEntryToHeader } from '../../prose'
import * as Input from './input'
import type { Message } from './message'
import type { Model } from './model'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  Input.basicHeader,
  Input.disabledHeader,
]

export const view = (
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [],
    [
      pageTitle('ui/input', 'Input'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A thin wrapper around the native input element that provides consistent accessibility attributes, ARIA label/description linking, and data-attribute hooks for styling.',
      ),
      ...Input.basicDemo(model, toParentMessage),
      ...Input.disabledDemo(model, toParentMessage),
    ],
  )
