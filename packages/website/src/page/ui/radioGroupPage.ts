import type { Html } from 'foldkit/html'

import { div } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { pageTitle, para, tableOfContentsEntryToHeader } from '../../prose'
import type { Message } from './message'
import type { Model } from './model'
import * as RadioGroup from './radioGroup'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  RadioGroup.verticalHeader,
  RadioGroup.horizontalHeader,
]

export const view = (
  model: Model,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [],
    [
      pageTitle('ui/radioGroup', 'Radio Group'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A set of radio options with accessible labeling, roving tabindex keyboard navigation, and per-option label and description linking. Arrow keys simultaneously move focus and select.',
      ),
      ...RadioGroup.verticalDemo(model.verticalRadioGroupDemo, toMessage),
      ...RadioGroup.horizontalDemo(model.horizontalRadioGroupDemo, toMessage),
    ],
  )
