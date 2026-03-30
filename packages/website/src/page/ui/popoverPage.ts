import type { Html } from 'foldkit/html'

import { div } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { pageTitle, para, tableOfContentsEntryToHeader } from '../../prose'
import type { Message } from './message'
import type { Model } from './model'
import * as Popover from './popover'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  Popover.basicHeader,
  Popover.animatedHeader,
]

export const view = (
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [],
    [
      pageTitle('ui/popover', 'Popover'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A floating panel that attaches to a trigger button with proper focus management. Unlike Menu (which has role="menu" and item navigation), Popover uses the disclosure pattern: the panel holds arbitrary content with natural Tab navigation.',
      ),
      ...Popover.basicDemo(model.popoverBasicDemo, toParentMessage),
      ...Popover.animatedDemo(model.popoverAnimatedDemo, toParentMessage),
    ],
  )
