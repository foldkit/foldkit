import type { Html } from 'foldkit/html'

import { div } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { pageTitle, para, tableOfContentsEntryToHeader } from '../../prose'
import * as Combobox from './combobox'
import type { Message } from './message'
import type { Model } from './model'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  Combobox.singleSelectHeader,
  Combobox.nullableHeader,
  Combobox.multiHeader,
  Combobox.selectOnFocusHeader,
]

export const view = (
  model: Model,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [],
    [
      pageTitle('ui/combobox', 'Combobox'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'An autocomplete input with filtering, keyboard navigation, and custom rendering. Uses aria-activedescendant for focus management and supports grouped items.',
      ),
      ...Combobox.comboboxDemo(model.comboboxDemo, toMessage),
      ...Combobox.nullableDemo(model.comboboxNullableDemo, toMessage),
      ...Combobox.multiDemo(model.comboboxMultiDemo, toMessage),
      ...Combobox.selectOnFocusDemo(model.comboboxSelectOnFocusDemo, toMessage),
    ],
  )
