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
import * as Tooltip from './tooltip'

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

const programmaticHelpersHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'programmatic-helpers',
  text: 'Programmatic Helpers',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  examplesHeader,
  stylingHeader,
  keyboardInteractionHeader,
  accessibilityHeader,
  apiReferenceHeader,
  initConfigHeader,
  viewConfigHeader,
  programmaticHelpersHeader,
]

// SECTION DATA

const initConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'id',
    type: 'string',
    description: 'Unique ID for the tooltip instance.',
  },
  {
    name: 'showDelay',
    type: 'Duration.DurationInput',
    default: 'Duration.millis(500)',
    description:
      'How long the pointer must hover before the tooltip appears. Accepts any Effect Duration input. A bare number is interpreted as milliseconds. Keyboard focus shows the tooltip immediately regardless of this value.',
  },
]

const viewConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'model',
    type: 'Tooltip.Model',
    description: 'The tooltip state from your parent Model.',
  },
  {
    name: 'toParentMessage',
    type: '(childMessage: Tooltip.Message) => ParentMessage',
    description:
      'Wraps Tooltip Messages in your parent Message type for Submodel delegation.',
  },
  {
    name: 'anchor',
    type: 'AnchorConfig',
    description:
      'Floating positioning config: placement, gap, and padding. Required.',
  },
  {
    name: 'triggerContent',
    type: 'Html',
    description: 'Content rendered inside the trigger button.',
  },
  {
    name: 'content',
    type: 'Html',
    description: 'Content rendered inside the tooltip panel.',
  },
  {
    name: 'triggerClassName',
    type: 'string',
    description: 'CSS class for the trigger button.',
  },
  {
    name: 'triggerAttributes',
    type: 'ReadonlyArray<Attribute<Message>>',
    description: 'Additional attributes for the trigger button.',
  },
  {
    name: 'panelClassName',
    type: 'string',
    description: 'CSS class for the panel.',
  },
  {
    name: 'panelAttributes',
    type: 'ReadonlyArray<Attribute<Message>>',
    description: 'Additional attributes for the panel.',
  },
  {
    name: 'isDisabled',
    type: 'boolean',
    default: 'false',
    description:
      'Disables the trigger. Hover, focus, and keyboard events are ignored and the tooltip will not open.',
  },
]

const programmaticHelpers: ReadonlyArray<PropEntry> = [
  {
    name: 'setShowDelay',
    type: '(model: Model, showDelay: Duration.DurationInput) => [Model, Commands]',
    description:
      'Updates the hover show-delay. Accepts any Effect Duration input (a bare number is interpreted as milliseconds). Applies to subsequent hovers; any in-flight delay is invalidated.',
  },
]

const dataAttributes: ReadonlyArray<DataAttributeEntry> = [
  {
    attribute: 'data-open',
    condition: 'Present on trigger and panel when the tooltip is visible.',
  },
  {
    attribute: 'data-disabled',
    condition: 'Present on the trigger when disabled.',
  },
]

const keyboardEntries: ReadonlyArray<KeyboardEntry> = [
  {
    key: 'Escape',
    description:
      'Hides the tooltip while visible. It will not reopen until the user disengages by moving the pointer away or blurring the trigger.',
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
      pageTitle('ui/tooltip', 'Tooltip'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A non-interactive floating label anchored to a trigger. Tooltips appear on hover after a short delay, or immediately on keyboard focus. They hide on pointer-leave, blur, Escape, or left-click of the trigger. Use tooltips for short hints about a control. For rich content or interactive panels, use ',
        inlineCode('Popover'),
        ' instead.',
      ),
      para(
        'The positioning engine is shared with ',
        inlineCode('Popover'),
        ' and ',
        inlineCode('Menu'),
        '. Pass ',
        inlineCode('anchor'),
        ' to control placement and spacing.',
      ),
      infoCallout(
        'See it in an app',
        'Check out how Tooltip is wired up in a ',
        link(uiShowcaseViewSourceHref('tooltip'), 'real Foldkit app'),
        '.',
      ),
      heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
      para(
        'Hover or tab into the trigger to reveal the tooltip. Hover waits for ',
        inlineCode('showDelay'),
        ' (default 500ms); keyboard focus shows it immediately.',
      ),
      demoContainer(...Tooltip.demo(model.tooltipDemo, toParentMessage)),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippet.uiTooltipBasicHighlighted)],
          [],
        ),
        Snippet.uiTooltipBasicRaw,
        'Copy tooltip example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
      para(
        'Tooltip is headless. The trigger and panel are both styled through className and attribute props. The panel is rendered with ',
        inlineCode('pointer-events: none'),
        ' so it never captures hover or clicks, which keeps the open/close logic tied to the trigger.',
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
        'The panel has ',
        inlineCode('role="tooltip"'),
        ' and the trigger is linked via ',
        inlineCode('aria-describedby'),
        '. Focus is never moved into the tooltip, so assistive technology announces the panel contents as a description of the trigger.',
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
        inlineCode('Tooltip.init()'),
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
        inlineCode('Tooltip.view()'),
        '.',
      ),
      propTable(viewConfigProps),
      heading(
        programmaticHelpersHeader.level,
        programmaticHelpersHeader.id,
        programmaticHelpersHeader.text,
      ),
      para(
        'Helper functions for driving the tooltip from parent update handlers, returning ',
        inlineCode('[Model, Commands]'),
        '.',
      ),
      propTable(programmaticHelpers),
    ],
  )
