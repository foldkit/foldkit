import type { Html } from 'foldkit/html'

import { div } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { pageTitle, para, tableOfContentsEntryToHeader } from '../../prose'
import * as Listbox from './listbox'
import type { Message } from './message'
import type { Model } from './model'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  Listbox.singleSelectHeader,
  Listbox.multiSelectHeader,
  Listbox.groupedHeader,
]

export const view = (
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [],
    [
      pageTitle('ui/listbox', 'Listbox'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A custom select dropdown with persistent selection, keyboard navigation, and typeahead search. Unlike Menu (which is fire-and-forget), Listbox tracks the selected value and reflects it in the button.',
      ),
      ...Listbox.basicDemo(model.listboxDemo, toParentMessage),
      ...Listbox.multiSelectDemo(model.listboxMultiDemo, toParentMessage),
      ...Listbox.groupedDemo(model.listboxGroupedDemo, toParentMessage),
    ],
  )
