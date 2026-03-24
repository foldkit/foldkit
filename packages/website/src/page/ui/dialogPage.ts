import type { Html } from 'foldkit/html'

import { div } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { pageTitle, para, tableOfContentsEntryToHeader } from '../../prose'
import * as Dialog from './dialog'
import type { Message } from './message'
import type { Model } from './model'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  Dialog.basicHeader,
  Dialog.animatedHeader,
]

export const view = (
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [],
    [
      pageTitle('ui/dialog', 'Dialog'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A modal dialog backed by the native <dialog> element. Uses showModal() for focus trapping, backdrop rendering, and scroll locking — no JavaScript focus trap needed.',
      ),
      ...Dialog.dialogDemo(model.dialogDemo, toParentMessage),
      ...Dialog.dialogAnimatedDemo(model.dialogAnimatedDemo, toParentMessage),
    ],
  )
