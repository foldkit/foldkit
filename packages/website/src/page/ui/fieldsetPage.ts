import type { Html } from 'foldkit/html'

import { div } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { pageTitle, para, tableOfContentsEntryToHeader } from '../../prose'
import * as Fieldset from './fieldset'
import type { Message } from './message'
import type { Model } from './model'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  Fieldset.basicHeader,
  Fieldset.disabledHeader,
]

export const view = (
  model: Model,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [],
    [
      pageTitle('ui/fieldset', 'Fieldset'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A structural wrapper around the native fieldset element that groups related form controls with a legend and description, providing consistent ARIA linking and a disabled state that propagates to all child form elements.',
      ),
      ...Fieldset.basicDemo(model, toMessage),
      ...Fieldset.disabledDemo(model, toMessage),
    ],
  )
