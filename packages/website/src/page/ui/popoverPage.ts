import { Submodel } from 'foldkit'
import { Html, html } from 'foldkit/html'

import { uiShowcaseViewSourceHref } from '../../link'
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

const renderInfoHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'render-info',
  text: 'RenderInfo',
}

const outMessageHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'out-message',
  text: 'OutMessage',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  examplesHeader,
  Popover.basicHeader,
  Popover.animatedHeader,
  Popover.nestedHeader,
  stylingHeader,
  keyboardInteractionHeader,
  accessibilityHeader,
  apiReferenceHeader,
  initConfigHeader,
  viewConfigHeader,
  renderInfoHeader,
  outMessageHeader,
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
  {
    name: 'contentFocus',
    type: 'boolean',
    default: 'false',
    description:
      'Hands focus ownership to the consumer. When true, the panel is not focusable and does not close on blur; the consumer must focus a descendant on open and decide on its own blur rules.',
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
    name: 'anchor',
    type: 'AnchorConfig',
    description:
      'Floating positioning config: placement, gap, and padding. Required.',
  },
  {
    name: 'toView',
    type: '(render: RenderInfo) => Html',
    description:
      'Callback that receives the button, panel, and backdrop attribute bundles plus a derived `isVisible` flag, and returns the composed layout.',
  },
  {
    name: 'isDisabled',
    type: 'boolean',
    default: 'false',
    description: 'Disables the trigger button.',
  },
  {
    name: 'focusSelector',
    type: 'string',
    description:
      'CSS selector for the element to focus after the panel is positioned. Defaults to the panel itself.',
  },
]

const renderInfoProps: ReadonlyArray<PropEntry> = [
  {
    name: 'button',
    type: 'ReadonlyArray<ChildAttribute>',
    description:
      'Spread onto the trigger button. Includes the button id, `aria-expanded`, `aria-controls`, and pointer/keyboard handlers.',
  },
  {
    name: 'panel',
    type: 'ReadonlyArray<ChildAttribute>',
    description:
      'Spread onto the floating panel. Includes the anchor Mount that positions the panel via Floating UI, ARIA linkage to the button, and panel keydown/blur handlers.',
  },
  {
    name: 'backdrop',
    type: 'ReadonlyArray<ChildAttribute>',
    description:
      "Spread onto the modal backdrop element. Includes the portal Mount that moves the backdrop to `document.body`. The backdrop's click handler dispatches `RequestedClose`.",
  },
  {
    name: 'isVisible',
    type: 'boolean',
    description:
      'Derived from `isOpen` and the Animation `transitionState`. Render the panel and backdrop only while this is true.',
  },
]

const outMessageProps: ReadonlyArray<PropEntry> = [
  {
    name: 'Opened',
    type: '{}',
    description:
      'Emitted once the popover has transitioned to open. Fires after `update` has processed `RequestedOpen` and `isOpen` reflects the new state.',
  },
  {
    name: 'Closed',
    type: '{}',
    description:
      'Emitted once the popover has transitioned to closed. Programmatic `Popover.close` on an already-closed model is a no-op that does not re-emit.',
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
      'Navigates within the panel. By default, closes the popover when focus leaves.',
  },
]

// VIEW

type ViewInputs = Readonly<{ copiedSnippets: CopiedSnippets }>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { copiedSnippets }): Html => {
    const h = html<Message>()

    return h.div(
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
          inlineCode('[Model, Commands, Option<OutMessage>]'),
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
        demoContainer(...Popover.basicDemo(model.popoverBasicDemo)),
        highlightedCodeBlock(
          h.div(
            [
              h.Class('text-sm'),
              h.InnerHTML(Snippet.uiPopoverBasicHighlighted),
            ],
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
        demoContainer(...Popover.animatedDemo(model.popoverAnimatedDemo)),
        heading(
          Popover.nestedHeader.level,
          Popover.nestedHeader.id,
          Popover.nestedHeader.text,
        ),
        para(
          'Use a separate Popover Model for each level. For a parent panel that opens onto another Popover trigger, pass ',
          inlineCode('contentFocus: true'),
          ' at init and ',
          inlineCode('focusSelector'),
          ' in the view so focus lands on the nested trigger.',
        ),
        demoContainer(
          ...Popover.nestedDemo(
            model.popoverNestedParentDemo,
            model.popoverNestedChildDemo,
          ),
        ),
        highlightedCodeBlock(
          h.div(
            [
              h.Class('text-sm'),
              h.InnerHTML(Snippet.uiPopoverNestedHighlighted),
            ],
            [],
          ),
          Snippet.uiPopoverNestedRaw,
          'Copy nested popovers example to clipboard',
          copiedSnippets,
          'mb-8',
        ),
        heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
        para(
          'Popover is headless. The ',
          inlineCode('toView'),
          ' callback receives attribute bundles for the button, panel, and backdrop, and the consumer composes the markup.',
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
          'By default, the panel receives ',
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
        heading(
          renderInfoHeader.level,
          renderInfoHeader.id,
          renderInfoHeader.text,
        ),
        para(
          'Payload delivered to the ',
          inlineCode('toView'),
          ' callback each render.',
        ),
        propTable(renderInfoProps),
        heading(
          outMessageHeader.level,
          outMessageHeader.id,
          outMessageHeader.text,
        ),
        para(
          'Messages emitted to the parent through the third element of ',
          inlineCode('[Model, Commands, Option<OutMessage>]'),
          '. Pattern-match on the OutMessage in your update handler.',
        ),
        propTable(outMessageProps),
      ],
    )
  },
)
