import type { Html } from 'foldkit/html'

import { div } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { pageTitle, para, tableOfContentsEntryToHeader } from '../../prose'
import * as Button from './button'
import type { Message } from './message'
import type { Model } from './model'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  Button.basicHeader,
  Button.disabledHeader,
]

export const view = (
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [],
    [
      pageTitle('ui/button', 'Button'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A thin wrapper around the native button element that provides consistent accessibility attributes and data-attribute hooks for styling.',
      ),
      ...Button.basicDemo(model, toParentMessage),
      ...Button.disabledDemo(model, toParentMessage),
    ],
  )
