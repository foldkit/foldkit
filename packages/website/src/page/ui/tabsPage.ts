import type { Html } from 'foldkit/html'

import { div } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { pageTitle, para, tableOfContentsEntryToHeader } from '../../prose'
import type { Message } from './message'
import type { Model } from './model'
import * as Tabs from './tabs'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  Tabs.horizontalHeader,
  Tabs.verticalHeader,
]

export const view = (
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [],
    [
      pageTitle('ui/tabs', 'Tabs'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A fully accessible tabs component with keyboard navigation. Renders a tablist with tab buttons and a tabpanel. Supports Home/End to jump, with wrapping.',
      ),
      ...Tabs.horizontalDemo(model.horizontalTabsDemo, toParentMessage),
      ...Tabs.verticalDemo(model.verticalTabsDemo, toParentMessage),
    ],
  )
