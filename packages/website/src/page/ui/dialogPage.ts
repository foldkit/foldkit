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
  Dialog.basicHeader,
  Dialog.animatedHeader,
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
    description: 'Enables animation coordination for open/close animations.',
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
    type: '(childMessage: Dialog.Message) => ParentMessage',
    description:
      'Wraps Dialog Messages in your parent Message type for Submodel delegation.',
  },
  {
    name: 'toView',
    type: '(render: RenderInfo) => Html',
    description:
      'Callback that receives the dialog, backdrop, and panel attribute bundles plus a derived `isVisible` flag, and returns the composed layout. The consumer MUST render an `h.dialog(...)` element so the framework can target it with `showModal()` / `close()`.',
  },
]

const renderInfoProps: ReadonlyArray<PropEntry> = [
  {
    name: 'dialog',
    type: 'ReadonlyArray<ChildAttribute>',
    description:
      'Spread onto an `h.dialog(...)` element. Carries the id, ARIA labelling, `open` prop, positioning style, and the Escape handler that wires to `RequestedClose`.',
  },
  {
    name: 'backdrop',
    type: 'ReadonlyArray<ChildAttribute>',
    description:
      'Spread onto the backdrop element. Includes the Animation data attributes and the outside-click handler that dispatches `RequestedClose` (suppressed while a leave animation is in progress).',
  },
  {
    name: 'panel',
    type: 'ReadonlyArray<ChildAttribute>',
    description:
      'Spread onto the panel element. Includes the panel id (`${id}-panel`) and the Animation data attributes.',
  },
  {
    name: 'isVisible',
    type: 'boolean',
    description:
      'Derived from `isOpen` and the Animation `transitionState`. Render the backdrop and panel only while this is true.',
  },
]

const outMessageProps: ReadonlyArray<PropEntry> = [
  {
    name: 'Opened',
    type: '{}',
    description:
      'Emitted once the dialog has transitioned to open. Fires after `update` has processed `RequestedOpen` and `isOpen` reflects the new state.',
  },
  {
    name: 'Closed',
    type: '{}',
    description:
      'Emitted once the dialog has transitioned to closed. Programmatic `Dialog.close` on an already-closed model is a no-op that does not re-emit, as is calling close while a leave animation is already in progress.',
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

type ViewInputs = Readonly<{ copiedSnippets: CopiedSnippets }>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { copiedSnippets }): Html => {
    const h = html<Message>()

    return h.div(
      [],
      [
        pageTitle('ui/dialog', 'Dialog'),
        tableOfContentsEntryToHeader(overviewHeader),
        para(
          'A modal dialog backed by the native ',
          inlineCode('<dialog>'),
          ' element. Uses ',
          inlineCode('showModal()'),
          ' for focus trapping, backdrop rendering, and scroll locking. No JavaScript focus trap needed. For non-modal floating content, use Popover instead.',
        ),
        infoCallout(
          'See it in an app',
          'Check out how Dialog is wired up in a ',
          link(uiShowcaseViewSourceHref('dialog'), 'real Foldkit app'),
          '.',
        ),
        heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
        heading(
          Dialog.basicHeader.level,
          Dialog.basicHeader.id,
          Dialog.basicHeader.text,
        ),
        para(
          'Open the dialog by dispatching ',
          inlineCode('Dialog.RequestedOpen()'),
          ' and close it with ',
          inlineCode('Dialog.RequestedClose()'),
          '. For programmatic control in update functions, use ',
          inlineCode('Dialog.open(model)'),
          ' and ',
          inlineCode('Dialog.close(model)'),
          ' which return ',
          inlineCode('[Model, Commands, Option<OutMessage>]'),
          ' directly. Use ',
          inlineCode('Dialog.titleId(model)'),
          ' on a heading element so the dialog is labeled for screen readers.',
        ),
        demoContainer(...Dialog.dialogDemo(model.dialogDemo)),
        highlightedCodeBlock(
          h.div(
            [h.Class('text-sm'), h.InnerHTML(Snippet.uiDialogBasicHighlighted)],
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
          ' at init to coordinate animations. The component manages an Animation submodel internally. Apply transition classes using ',
          inlineCode('data-closed'),
          ' (e.g. ',
          inlineCode('data-[closed]:opacity-0 data-[closed]:scale-95'),
          ').',
        ),
        demoContainer(...Dialog.dialogAnimatedDemo(model.dialogAnimatedDemo)),
        highlightedCodeBlock(
          h.div(
            [
              h.Class('text-sm'),
              h.InnerHTML(Snippet.uiDialogAnimatedHighlighted),
            ],
            [],
          ),
          Snippet.uiDialogAnimatedRaw,
          'Copy animated dialog example to clipboard',
          copiedSnippets,
          'mb-8',
        ),
        heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
        para(
          'Dialog is headless. The ',
          inlineCode('toView'),
          ' callback receives attribute bundles for the dialog, backdrop, and panel, and the consumer composes the markup. The native ',
          inlineCode('<dialog>'),
          ' element handles the top layer, so style its ',
          inlineCode('::backdrop'),
          ' as ',
          inlineCode('backdrop:bg-transparent'),
          ' and render your own custom backdrop for full control.',
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
        para(
          'Configuration object passed to ',
          inlineCode('Dialog.init()'),
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
          inlineCode('Dialog.view()'),
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
