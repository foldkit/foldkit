import type { Html } from 'foldkit/html'

import { div } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { exampleDetailRouter, patternsSubmodelsRouter } from '../../route'
import * as DragAndDrop from './dragAndDrop'
import type { Message } from './message'
import type { Model } from './model'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  DragAndDrop.demoHeader,
]

export const view = (
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [],
    [
      pageTitle('ui/drag-and-drop', 'Drag and Drop'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A headless drag-and-drop component for building sortable lists and cross-container movement. Manages the full drag lifecycle — pointer tracking, collision detection, keyboard navigation, auto-scrolling, and accessibility announcements — while leaving all rendering to you.',
      ),
      para(
        'Integrate via the ',
        link(patternsSubmodelsRouter(), 'Submodels'),
        ' pattern: embed the ',
        inlineCode('DragAndDrop.Model'),
        ' in your Model, forward its Messages and Subscriptions, and use view helpers like ',
        inlineCode('draggable()'),
        ', ',
        inlineCode('droppable()'),
        ', and ',
        inlineCode('ghost()'),
        ' to attach behavior to your elements. The component emits ',
        inlineCode('Reordered'),
        ' and ',
        inlineCode('Cancelled'),
        ' OutMessages so your update function decides what happens on drop.',
      ),
      para(
        'For a full example with localStorage persistence, add-card forms, and screen reader announcements, see the ',
        link(exampleDetailRouter({ exampleSlug: 'kanban' }), 'Kanban example'),
        '.',
      ),
      ...DragAndDrop.demo(model, toParentMessage),
    ],
  )
