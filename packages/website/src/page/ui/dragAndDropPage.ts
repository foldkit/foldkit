import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import { exampleSourceHref, uiShowcaseViewSourceHref } from '../../link'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import {
  demoContainer,
  heading,
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { exampleDetailRouter } from '../../route'
import * as Snippet from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'
import {
  type DataAttributeEntry,
  type KeyboardEntry,
  type PropEntry,
  dataAttributeTable,
  keyboardTable,
  propTable,
} from '../../view/docTable'
import * as DragAndDrop from './dragAndDrop'
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

const stylingHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'styling',
  text: 'Styling',
}

const keyboardInteractionHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'keyboard-interaction',
  text: 'Keyboard Interaction',
}

const accessibilityHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'accessibility',
  text: 'Accessibility',
}

const apiReferenceHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'api-reference',
  text: 'API Reference',
}

const initConfigHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'init-config',
  text: 'InitConfig',
}

const viewHelpersHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'view-helpers',
  text: 'View Helpers',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  examplesHeader,
  DragAndDrop.demoHeader,
  stylingHeader,
  keyboardInteractionHeader,
  accessibilityHeader,
  apiReferenceHeader,
  initConfigHeader,
  viewHelpersHeader,
]

// SECTION DATA

const initConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'id',
    type: 'string',
    description: 'Unique ID for the drag-and-drop instance.',
  },
  {
    name: 'orientation',
    type: "'Vertical' | 'Horizontal'",
    default: "'Vertical'",
    description: 'Item flow direction. Controls arrow key mapping.',
  },
  {
    name: 'activationThreshold',
    type: 'number',
    default: '5',
    description:
      'Minimum pointer movement in pixels before a drag activates. Prevents accidental drags from clicks.',
  },
]

const viewHelperProps: ReadonlyArray<PropEntry> = [
  {
    name: 'draggable(config)',
    type: 'ReadonlyArray<Attribute>',
    description:
      'Spread onto draggable items. Attaches pointer-down, keyboard activation, and ARIA attributes. Config requires model, toParentMessage, itemId, containerId, and index.',
  },
  {
    name: 'droppable(containerId, label?)',
    type: 'ReadonlyArray<Attribute>',
    description:
      'Spread onto drop containers. Attaches the container ID for collision detection and optional ARIA label.',
  },
  {
    name: 'sortable(itemId)',
    type: 'ReadonlyArray<Attribute>',
    description:
      'Spread onto items that are both draggable and sortable targets.',
  },
  {
    name: 'ghostStyle(model)',
    type: 'Option<CSSProperties>',
    description:
      'Returns positioning styles for a ghost element that follows the pointer during drag. Use with Option.match to conditionally render.',
  },
  {
    name: 'isDragging(model)',
    type: 'boolean',
    description: 'Whether a drag is currently in progress.',
  },
  {
    name: 'maybeDraggedItemId(model)',
    type: 'Option<string>',
    description: 'The ID of the item being dragged, if any.',
  },
  {
    name: 'maybeDropTarget(model)',
    type: 'Option<DropTarget>',
    description: 'The current drop target (containerId + index), if any.',
  },
]

const dataAttributes: ReadonlyArray<DataAttributeEntry> = [
  {
    attribute: 'data-draggable-id',
    condition: 'Set on draggable items with the item ID.',
  },
  {
    attribute: 'data-sortable-id',
    condition: 'Set on sortable items with the item ID.',
  },
  {
    attribute: 'data-droppable-id',
    condition: 'Set on drop containers with the container ID.',
  },
]

const keyboardEntries: ReadonlyArray<KeyboardEntry> = [
  {
    key: 'Space / Enter',
    description: 'Activates keyboard drag mode on a focused item.',
  },
  {
    key: 'Arrow Up / Down',
    description: 'Moves the item within its container (vertical orientation).',
  },
  {
    key: 'Arrow Left / Right',
    description:
      'Moves the item within its container (horizontal orientation).',
  },
  {
    key: 'Tab / Shift+Tab',
    description: 'Moves the item to the next / previous container.',
  },
  {
    key: 'Space / Enter',
    description: 'Confirms the drop at the current position.',
  },
  {
    key: 'Escape',
    description:
      'Cancels the drag and returns the item to its original position.',
  },
]

// VIEW

export const view = (
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
  copiedSnippets: CopiedSnippets,
): Html =>
  div(
    [],
    [
      pageTitle('ui/drag-and-drop', 'Drag and Drop'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Sortable lists and cross-container movement with pointer tracking, keyboard navigation, collision detection, auto-scrolling, and screen reader announcements.',
      ),
      para(
        'DragAndDrop is different from other Foldkit UI components in two ways. First, it doesn\u2019t have a ',
        inlineCode('view()'),
        ' function — instead, you spread ',
        inlineCode('draggable()'),
        ' and ',
        inlineCode('droppable()'),
        ' attributes onto your own elements. Second, its update function returns a three-tuple: ',
        inlineCode('[model, commands, maybeOutMessage]'),
        '. You handle ',
        inlineCode('Reordered'),
        ' and ',
        inlineCode('Cancelled'),
        ' OutMessages to decide how to reorder your data.',
      ),
      para(
        'Integration requires four pieces: a ',
        inlineCode('DragAndDrop.Model'),
        ' field in your Model, update delegation with OutMessage handling, ',
        inlineCode('DragAndDrop.subscriptions'),
        ' for document-level pointer and keyboard listeners, and ',
        inlineCode('draggable()'),
        ' / ',
        inlineCode('droppable()'),
        ' attributes in your view.',
      ),
      infoCallout(
        'See it in an app',
        'Check out how DragAndDrop is wired up in the ',
        link(exampleSourceHref('kanban'), 'kanban example'),
        ' or the ',
        link(uiShowcaseViewSourceHref('dragAndDrop'), 'UI showcase'),
        '.',
      ),
      heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
      heading(
        DragAndDrop.demoHeader.level,
        DragAndDrop.demoHeader.id,
        DragAndDrop.demoHeader.text,
      ),
      para(
        'The snippet below shows a minimal sortable list with all four integration pieces. For a full example with persistence, cross-container moves, and add-card forms, see the ',
        link(exampleDetailRouter({ exampleSlug: 'kanban' }), 'Kanban example'),
        '.',
      ),
      demoContainer(...DragAndDrop.demo(model, toParentMessage)),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippet.uiDragAndDropBasicHighlighted)],
          [],
        ),
        Snippet.uiDragAndDropBasicRaw,
        'Copy drag and drop example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
      para(
        'DragAndDrop is fully headless — you render all items, containers, and ghost elements. Use ',
        inlineCode('isDragging()'),
        ' and ',
        inlineCode('maybeDraggedItemId()'),
        ' to conditionally style items during drag (e.g. reduced opacity on the source, a drop placeholder at the target).',
      ),
      dataAttributeTable(dataAttributes),
      heading(
        keyboardInteractionHeader.level,
        keyboardInteractionHeader.id,
        keyboardInteractionHeader.text,
      ),
      para(
        'DragAndDrop supports full keyboard navigation. Space/Enter activates drag mode, arrow keys move the item, Tab/Shift+Tab moves between containers, and Escape cancels.',
      ),
      keyboardTable(keyboardEntries),
      heading(
        accessibilityHeader.level,
        accessibilityHeader.id,
        accessibilityHeader.text,
      ),
      para(
        'Draggable items receive ',
        inlineCode('role="option"'),
        ' with ',
        inlineCode('aria-roledescription="draggable"'),
        '. Drop containers receive ',
        inlineCode('role="listbox"'),
        '. Screen reader announcements are emitted for drag start, movement, and drop via a live region.',
      ),
      heading(
        apiReferenceHeader.level,
        apiReferenceHeader.id,
        apiReferenceHeader.text,
      ),
      heading(
        initConfigHeader.level,
        initConfigHeader.id,
        initConfigHeader.text,
      ),
      para(
        'Configuration object passed to ',
        inlineCode('DragAndDrop.init()'),
        '.',
      ),
      propTable(initConfigProps),
      heading(
        viewHelpersHeader.level,
        viewHelpersHeader.id,
        viewHelpersHeader.text,
      ),
      para(
        'Functions for attaching drag-and-drop behavior to your elements and reading drag state.',
      ),
      propTable(viewHelperProps),
    ],
  )
