import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import { uiShowcaseViewSourceHref } from '../../link'
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
import { uiAnimationRouter } from '../../route'
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
import type { Message } from './message'
import type { Model } from './model'
import * as Popover from './popover'

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
  Popover.basicHeader,
  Popover.animatedHeader,
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
    description: 'Unique ID for the popover instance.',
  },
  {
    name: 'isAnimated',
    type: 'boolean',
    default: 'false',
    description: 'Enables animation coordination.',
  },
  {
    name: 'isModal',
    type: 'boolean',
    default: 'false',
    description: 'Locks page scroll and marks other elements inert when open.',
  },
]

const viewConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'model',
    type: 'Popover.Model',
    description: 'The popover state from your parent Model.',
  },
  {
    name: 'toParentMessage',
    type: '(childMessage: Popover.Message) => ParentMessage',
    description:
      'Wraps Popover Messages in your parent Message type for Submodel delegation.',
  },
  {
    name: 'buttonContent',
    type: 'Html',
    description: 'Content rendered inside the trigger button.',
  },
  {
    name: 'panelContent',
    type: 'Html',
    description: 'Content rendered inside the floating panel.',
  },
  {
    name: 'anchor',
    type: 'AnchorConfig',
    description:
      'Floating positioning config: placement, gap, and padding. Required.',
  },
  {
    name: 'buttonClassName',
    type: 'string',
    description: 'CSS class for the trigger button.',
  },
  {
    name: 'buttonAttributes',
    type: 'ReadonlyArray<Attribute<Message>>',
    description: 'Additional attributes for the trigger button.',
  },
  {
    name: 'panelClassName',
    type: 'string',
    description: 'CSS class for the floating panel.',
  },
  {
    name: 'panelAttributes',
    type: 'ReadonlyArray<Attribute<Message>>',
    description: 'Additional attributes for the panel.',
  },
  {
    name: 'backdropClassName',
    type: 'string',
    description: 'CSS class for the backdrop.',
  },
  {
    name: 'isDisabled',
    type: 'boolean',
    default: 'false',
    description: 'Disables the trigger button.',
  },
  {
    name: 'onOpened',
    type: '() => Message',
    description: 'Optional callback fired when the popover opens.',
  },
  {
    name: 'onClosed',
    type: '() => Message',
    description: 'Optional callback fired when the popover closes.',
  },
]

const dataAttributes: ReadonlyArray<DataAttributeEntry> = [
  {
    attribute: 'data-open',
    condition: 'Present on button and panel when open.',
  },
  {
    attribute: 'data-disabled',
    condition: 'Present on the button when disabled.',
  },
  { attribute: 'data-closed', condition: 'Present during close animation.' },
]

const keyboardEntries: ReadonlyArray<KeyboardEntry> = [
  { key: 'Enter / Space', description: 'Toggles the popover.' },
  {
    key: 'Escape',
    description: 'Closes the popover and returns focus to the button.',
  },
  {
    key: 'Tab',
    description:
      'Navigates within the panel. Closes the popover when focus leaves.',
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
      pageTitle('ui/popover', 'Popover'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'An anchored floating panel with natural Tab navigation. Unlike Dialog (which is modal and traps focus) or Menu (which uses aria-activedescendant for item navigation), Popover holds arbitrary content and uses the disclosure ARIA pattern. Focus flows naturally through the panel content.',
      ),
      para(
        'For programmatic control in update functions, use ',
        inlineCode('Popover.open(model)'),
        ' and ',
        inlineCode('Popover.close(model)'),
        ' which return ',
        inlineCode('[Model, Commands]'),
        ' directly.',
      ),
      infoCallout(
        'See it in an app',
        'Check out how Popover is wired up in a ',
        link(uiShowcaseViewSourceHref('popover'), 'real Foldkit app'),
        '.',
      ),
      heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
      heading(
        Popover.basicHeader.level,
        Popover.basicHeader.id,
        Popover.basicHeader.text,
      ),
      para(
        'Pass ',
        inlineCode('anchor'),
        ' to position the panel relative to the button. The panel can hold any content: links, forms, or informational text.',
      ),
      demoContainer(
        ...Popover.basicDemo(model.popoverBasicDemo, toParentMessage),
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippet.uiPopoverBasicHighlighted)],
          [],
        ),
        Snippet.uiPopoverBasicRaw,
        'Copy popover example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(
        Popover.animatedHeader.level,
        Popover.animatedHeader.id,
        Popover.animatedHeader.text,
      ),
      para(
        'Pass ',
        inlineCode('isAnimated: true'),
        ' at init for animation coordination.',
      ),
      demoContainer(
        ...Popover.animatedDemo(model.popoverAnimatedDemo, toParentMessage),
      ),
      heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
      para(
        'Popover is headless. Button and panel styling is controlled through className and attribute props.',
      ),
      para(
        'When ',
        inlineCode('isAnimated'),
        ' is true, enter/leave animations flow through the ',
        link(uiAnimationRouter(), 'Animation'),
        ' module. Style with CSS transitions or CSS keyframe animations. Animation advances once every animation on the element has settled.',
      ),
      dataAttributeTable(dataAttributes),
      heading(
        keyboardInteractionHeader.level,
        keyboardInteractionHeader.id,
        keyboardInteractionHeader.text,
      ),
      para(
        'The panel receives ',
        inlineCode('tabindex="0"'),
        ' so it can receive focus. Tab navigates naturally through the panel content. Escape closes and returns focus to the button.',
      ),
      keyboardTable(keyboardEntries),
      heading(
        accessibilityHeader.level,
        accessibilityHeader.id,
        accessibilityHeader.text,
      ),
      para(
        'The button receives ',
        inlineCode('aria-expanded'),
        ' and ',
        inlineCode('aria-controls'),
        ' linking to the panel. The panel has no role. Popover uses the disclosure pattern, not the menu pattern.',
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
        inlineCode('Popover.init()'),
        '.',
      ),
      propTable(initConfigProps),
      heading(
        viewConfigHeader.level,
        viewConfigHeader.id,
        viewConfigHeader.text,
      ),
      para(
        'Configuration object passed to ',
        inlineCode('Popover.view()'),
        '.',
      ),
      propTable(viewConfigProps),
    ],
  )
