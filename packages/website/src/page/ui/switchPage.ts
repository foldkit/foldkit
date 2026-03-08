import type { Html } from 'foldkit/html'

import { div } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { pageTitle, para, tableOfContentsEntryToHeader } from '../../prose'
import type { Message } from './message'
import type { Model } from './model'
import * as Switch from './switch'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [overviewHeader]

export const view = (
  model: Model,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [],
    [
      pageTitle('ui/switch', 'Switch'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A toggle switch for on/off states with accessible labeling, keyboard support, and optional form integration via a hidden input.',
      ),
      ...Switch.switchDemo(model.switchDemo, toMessage),
    ],
  )
