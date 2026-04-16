import type { Html } from 'foldkit/html'

import { div } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import {
  demoContainer,
  heading,
  inlineCode,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import type { CopiedSnippets } from '../../view/codeBlock'
import * as DatePicker from './datePicker'
import type { Message } from './message'
import type { Model } from './model'

// TABLE OF CONTENTS

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const examplesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'examples',
  text: 'Examples',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  examplesHeader,
]

// VIEW

export const view = (
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
  _copiedSnippets: CopiedSnippets,
): Html =>
  div(
    [],
    [
      pageTitle('ui/date-picker', 'Date Picker'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'An accessible date picker built as a thin wrapper over ',
        inlineCode('Calendar'),
        ' and ',
        inlineCode('Popover'),
        '. DatePicker exposes one flat API — you provide the trigger button face and the calendar grid layout, and DatePicker handles focus choreography (opening the popover focuses the grid, closing returns focus to the trigger), open/close state, and optional hidden form input for native form submission.',
      ),
      para(
        'Use ',
        inlineCode('DatePicker.init()'),
        ' with a ',
        inlineCode('today'),
        ' from ',
        inlineCode('Calendar.today.local'),
        ', store the Model in your parent Submodel field, and delegate messages via ',
        inlineCode('DatePicker.update()'),
        '. The update function returns ',
        inlineCode('[Model, Commands, Option<OutMessage>]'),
        ' — the OutMessage fires when the user commits a date or clears the selection.',
      ),
      heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
      para(
        'Click the trigger to open the popover, then click a day or use the arrow keys to navigate. Press Escape or click outside to close.',
      ),
      demoContainer(...DatePicker.basicDemo(model, toParentMessage)),
    ],
  )
