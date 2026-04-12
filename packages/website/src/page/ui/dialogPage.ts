import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
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
import * as Dialog from './dialog'
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

const viewConfigHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'view-config',
  text: 'ViewConfig',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  examplesHeader,
  Dialog.basicHeader,
  Dialog.animatedHeader,
  stylingHeader,
  keyboardInteractionHeader,
  accessibilityHeader,
  apiReferenceHeader,
  initConfigHeader,
  viewConfigHeader,
]

// SECTION DATA

const initConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'id',
    type: 'string',
    description: 'Unique ID for the dialog instance.',
  },
  {
    name: 'isOpen',
    type: 'boolean',
    default: 'false',
    description: 'Initial open/closed state.',
  },
  {
    name: 'isAnimated',
    type: 'boolean',
    default: 'false',
    description:
      'Enables CSS transition coordination for open/close animations.',
  },
  {
    name: 'focusSelector',
    type: 'string',
    description:
      'CSS selector for the element to focus when the dialog opens. Defaults to the first focusable element.',
  },
]

const viewConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'model',
    type: 'Dialog.Model',
    description: 'The dialog state from your parent Model.',
  },
  {
    name: 'toParentMessage',
    type: '(message: Message) => Message',
    description: 'Wraps Dialog Messages in your parent Message type.',
  },
  {
    name: 'panelContent',
    type: 'Html',
    description: 'Content rendered inside the dialog panel.',
  },
  {
    name: 'panelClassName',
    type: 'string',
    description: 'CSS class for the dialog panel.',
  },
  {
    name: 'panelAttributes',
    type: 'ReadonlyArray<Attribute<Message>>',
    description: 'Additional attributes for the dialog panel.',
  },
  {
    name: 'backdropClassName',
    type: 'string',
    description: 'CSS class for the backdrop overlay.',
  },
  {
    name: 'backdropAttributes',
    type: 'ReadonlyArray<Attribute<Message>>',
    description: 'Additional attributes for the backdrop.',
  },
  {
    name: 'onClosed',
    type: '() => Message',
    description:
      'Optional callback fired when the dialog closes, as an alternative to Submodel delegation.',
  },
  {
    name: 'className',
    type: 'string',
    description: 'CSS class for the native <dialog> element.',
  },
  {
    name: 'attributes',
    type: 'ReadonlyArray<Attribute<Message>>',
    description: 'Additional attributes for the native <dialog> element.',
  },
]

const dataAttributes: ReadonlyArray<DataAttributeEntry> = [
  {
    attribute: 'data-open',
    condition: 'Present on the dialog when visible.',
  },
  {
    attribute: 'data-closed',
    condition: 'Present during close animation.',
  },
  {
    attribute: 'data-transition',
    condition: 'Present during any animation phase.',
  },
  {
    attribute: 'data-enter',
    condition: 'Present during the enter animation.',
  },
  {
    attribute: 'data-leave',
    condition: 'Present during the leave animation.',
  },
]

const keyboardEntries: ReadonlyArray<KeyboardEntry> = [
  {
    key: 'Escape',
    description: 'Closes the dialog.',
  },
  {
    key: 'Tab',
    description:
      'Cycles focus within the dialog (focus trapping via showModal).',
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
      pageTitle('ui/dialog', 'Dialog'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A modal dialog backed by the native ',
        inlineCode('<dialog>'),
        ' element. Uses ',
        inlineCode('showModal()'),
        ' for focus trapping, backdrop rendering, and scroll locking — no JavaScript focus trap needed. For non-modal floating content, use Popover instead.',
      ),
      heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
      heading(
        Dialog.basicHeader.level,
        Dialog.basicHeader.id,
        Dialog.basicHeader.text,
      ),
      para(
        'Open the dialog by dispatching ',
        inlineCode('Dialog.Opened()'),
        ' and close it with ',
        inlineCode('Dialog.Closed()'),
        '. Use ',
        inlineCode('Dialog.titleId(model)'),
        ' on a heading element so the dialog is labeled for screen readers.',
      ),
      demoContainer(...Dialog.dialogDemo(model.dialogDemo, toParentMessage)),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippet.uiDialogBasicHighlighted)],
          [],
        ),
        Snippet.uiDialogBasicRaw,
        'Copy dialog example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(
        Dialog.animatedHeader.level,
        Dialog.animatedHeader.id,
        Dialog.animatedHeader.text,
      ),
      para(
        'Pass ',
        inlineCode('isAnimated: true'),
        ' at init to coordinate CSS transitions. The component manages a Transition submodel internally — apply transition classes using ',
        inlineCode('data-closed'),
        ' (e.g. ',
        inlineCode('data-[closed]:opacity-0 data-[closed]:scale-95'),
        ').',
      ),
      demoContainer(
        ...Dialog.dialogAnimatedDemo(model.dialogAnimatedDemo, toParentMessage),
      ),
      heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
      para(
        'Dialog is headless — you control the panel and backdrop markup through className and attribute props. The native ',
        inlineCode('<dialog>'),
        ' element handles the top layer, so style its ',
        inlineCode('::backdrop'),
        ' as ',
        inlineCode('backdrop:bg-transparent'),
        ' and render your own custom backdrop for full control.',
      ),
      dataAttributeTable(dataAttributes),
      heading(
        keyboardInteractionHeader.level,
        keyboardInteractionHeader.id,
        keyboardInteractionHeader.text,
      ),
      keyboardTable(keyboardEntries),
      heading(
        accessibilityHeader.level,
        accessibilityHeader.id,
        accessibilityHeader.text,
      ),
      para(
        'The dialog receives ',
        inlineCode('aria-labelledby'),
        ' pointing to the title element (use ',
        inlineCode('Dialog.titleId(model)'),
        ') and ',
        inlineCode('aria-describedby'),
        ' pointing to a description element (use ',
        inlineCode('Dialog.descriptionId(model)'),
        '). Focus trapping is handled natively by ',
        inlineCode('showModal()'),
        '.',
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
      para('Configuration object passed to ', inlineCode('Dialog.init()'), '.'),
      propTable(initConfigProps),
      heading(
        viewConfigHeader.level,
        viewConfigHeader.id,
        viewConfigHeader.text,
      ),
      para('Configuration object passed to ', inlineCode('Dialog.view()'), '.'),
      propTable(viewConfigProps),
    ],
  )
