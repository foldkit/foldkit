import type { Html } from 'foldkit/html'

import { div } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { pageTitle, para, tableOfContentsEntryToHeader } from '../../prose'
import * as Menu from './menu'
import type { Message } from './message'
import type { Model } from './model'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  Menu.basicHeader,
  Menu.animatedHeader,
]

export const view = (
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [],
    [
      pageTitle('ui/menu', 'Menu'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A dropdown menu with keyboard navigation, typeahead search, and proper ARIA attributes. Uses aria-activedescendant for focus management. Focus stays on the menu container while items are highlighted by reference.',
      ),
      ...Menu.basicDemo(model.menuBasicDemo, toParentMessage),
      ...Menu.animatedDemo(model.menuAnimatedDemo, toParentMessage),
    ],
  )
